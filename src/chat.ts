import { OpenAI } from "openai";
import * as dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const args = process.argv.slice(2);

  const usePro = args.includes("--pro");
  const prompt = args.filter(arg => arg !== "--pro").join(" ");

  if (!prompt) {
    console.log("Usage: chat <your question> [--pro]");
    console.log("Default: gpt-5-mini | With --pro: gpt-5");
    process.exit(1);
  }

  const model = usePro ? "gpt-5" : "gpt-5-mini";

  const response = await client.responses.create({
    model,
    input: prompt
  });

  // ✅ Works on gpt-5o and gpt-5-mini
  const text = response.output_text;

  console.log(`\n[${model}] →`);
  console.log(text + "\n");
}

main();