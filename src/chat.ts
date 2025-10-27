import { OpenAI } from "openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Paths
const HISTORY_DIR = path.resolve(__dirname, "../history");
const NOTES_DIR = path.resolve(__dirname, "../notes");
const CONTEXT_PATH = path.resolve(__dirname, "../context/index.md");

// Types
type Msg = { role: "system" | "user" | "assistant"; content: string };

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readContext(): string | undefined {
  try {
    if (fs.existsSync(CONTEXT_PATH)) {
      return fs.readFileSync(CONTEXT_PATH, "utf8");
    }
  } catch {}
  return undefined;
}

function readHistory(session: string): Msg[] {
  ensureDir(HISTORY_DIR);
  const file = path.join(HISTORY_DIR, `${session}.json`);
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      return JSON.parse(raw) as Msg[];
    }
  } catch {}
  return [];
}

function writeHistory(session: string, messages: Msg[]) {
  ensureDir(HISTORY_DIR);
  const file = path.join(HISTORY_DIR, `${session}.json`);
  fs.writeFileSync(file, JSON.stringify(messages, null, 2), "utf8");
}

function clearHistory(session: string): boolean {
  ensureDir(HISTORY_DIR);
  const file = path.join(HISTORY_DIR, `${session}.json`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    return true;
  }
  return false;
}

function writeNote(session: string, content: string) {
  ensureDir(NOTES_DIR);
  const file = path.join(NOTES_DIR, `${session}.md`);
  const entry = `\n\n### ${new Date().toISOString()}\n\n${content}\n`;
  fs.appendFileSync(file, entry, "utf8");
}

function clearNotes(session: string): boolean {
  ensureDir(NOTES_DIR);
  const file = path.join(NOTES_DIR, `${session}.md`);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    return true;
  }
  return false;
}

async function summarizeForLearning(originalText: string): Promise<string> {
  const prompt = `Convert the following assistant response into concise study notes with the following structure:

- Auto-detect topic title and use as heading
- Core Idea (1–2 sentences)
- Key Terms (3–7 terms with short definitions)
- Main Principles (3–7 bullet points, concise)
- How to Apply (3–5 clear steps)
- Encouragement (warm, supportive, short)

Tone: warm, confident, clear (Warm-2). Keep length medium but on the shorter side.

Text to convert:
"""
${originalText}
"""`;

  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      { role: "user", content: prompt }
    ]
  } as any);

  return (response as any).output_text as string;
}

function usage() {
  console.log(`Usage: chat <your message> [--pro] [--session <name>] [--new] [--no-context] [--max <n>] [--clear [name]]

Flags:
  --pro              Use gpt-5 (default is gpt-5-mini)
  --session <name>   Use/create a named chat history (default: main)
  --new              Start a fresh session (clears chosen session history)
  --no-context       Do not load context/context.md as system prompt
  --max <n>          Max number of previous *turns* to include (default: 20)
  --clear [name]     Clear history for a session (default: current --session or main)
  --notes            Save the assistant reply to notes/<session>.md
  --notes-learn      Convert reply into structured study notes and save
  --clear-notes [name]  Clear notes for a session (default: current --session or main)
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    usage();
    process.exit(1);
  }

  // CLI flags
  let usePro = false;
  let session = "main";
  let startFresh = false;
  let includeContext = true;
  let maxTurns = 20; // turns = user+assistant pairs

  const free: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--pro") usePro = true;
    else if (a === "--new") startFresh = true;
    else if (a === "--no-context") includeContext = false;
    else if (a === "--session") { session = args[i + 1] || "main"; i++; }
    else if (a === "--max") { maxTurns = Math.max(0, parseInt(args[i + 1] || "20", 10)); i++; }
    else if (a === "--clear") {
      const next = args[i + 1];
      // Accept optional session name unless it's another flag
      (global as any).__clearRequested = true;
      (global as any).__clearTarget = (next && !next.startsWith("--")) ? next : undefined;
      if ((global as any).__clearTarget) i++;
    }
    else if (a === "--notes") (global as any).__saveNote = true;
    else if (a === "--notes-learn") (global as any).__learnNote = true;
    else if (a === "--clear-notes") {
      const next = args[i + 1];
      (global as any).__clearNotesRequested = true;
      (global as any).__clearNotesTarget = (next && !next.startsWith("--")) ? next : undefined;
      if ((global as any).__clearNotesTarget) i++;
    }
    else free.push(a);
  }

  const prompt = free.join(" ").trim();

  if ((global as any).__clearNotesRequested) {
    const target = (global as any).__clearNotesTarget || session || "main";
    const ok = clearNotes(target);
    console.log(ok ? `Cleared notes: ${target}` : `No notes found for session: ${target}`);
    process.exit(0);
  }

  if ((global as any).__clearRequested) {
    const target = (global as any).__clearTarget || session || "main";
    const ok = clearHistory(target);
    if (ok) console.log(`Cleared session: ${target}`);
    else console.log(`No history found for session: ${target}`);
    process.exit(0);
  }

  if (!prompt) { usage(); process.exit(1); }

  // Models
  const model = usePro ? "gpt-5" : "gpt-5-mini";

  // History management
  let history = readHistory(session);
  if (startFresh) {
    history = [];
    writeHistory(session, history);
  }

  // Build messages to send
  const messages: Msg[] = [];
  if (includeContext) {
    const ctx = readContext();
    if (ctx && ctx.trim().length > 0) messages.push({ role: "system", content: ctx });
  }

  // We slice from the end: lastMessages = up to 2*maxTurns messages
  const lastMessages = history.slice(-Math.max(0, maxTurns * 2));
  messages.push(...lastMessages);

  // Current user input
  messages.push({ role: "user", content: prompt });

  // Call OpenAI Responses API with chat-style messages
  const response = await client.responses.create({
    model,
    input: messages,
  } as any);

  const text = (response as any).output_text as string;

  if ((global as any).__learnNote) {
    const summary = await summarizeForLearning(text);
    writeNote(session, summary);
    console.log(`(saved structured learning notes to notes/${session}.md)`);
    // Still persist full history conversation for context
    history.push({ role: "user", content: prompt });
    history.push({ role: "assistant", content: text });
    writeHistory(session, history);
    process.exit(0);
  }

  console.log(`\n[${model}] (session: ${session}) →`);
  console.log(text + "\n");

  if ((global as any).__saveNote) {
    writeNote(session, text);
    console.log(`(saved to notes/${session}.md)`);
  }

  // Persist updated history
  history.push({ role: "user", content: prompt });
  history.push({ role: "assistant", content: text });
  writeHistory(session, history);
}

main().catch((err) => {
  console.error("\nError:", err?.message || err);
  process.exit(1);
});