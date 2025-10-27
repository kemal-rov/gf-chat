# gf-chat

A tiny, personal, terminal-based ChatGPT wrapper made so my girlfriend can use OpenAI models **without needing a paid ChatGPT subscription**, and with **better memory + personal learning notes**.

This project keeps things **simple, cozy, and useful**, but not cringe. Probably.

---

## Features

- **Chat with memory** (conversations persist per-session)
- **Personal context support** (the assistant can be warm + helpful + tailored)
- **Multiple sessions** (e.g., `design`, `stream`, `growth`, etc.)
- **Optional structured learning notes** using `--notes-learn`
- **Manual full transcript note-saving** using `--notes`
- **Clear history or clear notes anytime**
- **Works fully in the terminal** — no UI needed

---

## Model Modes

| Mode | Flag | Model Used | Use Case |
|------|------|------------|----------|
| Basic / Fast | *(default)* | `gpt-5-mini` | Daily chatting, tips, light explanations |
| Advanced Reasoning | `--pro` | `gpt-5` | Deep thinking, planning, problem-solving |

You can switch per message. No subscription required — usage billed to your OpenAI API key.

---

## Setup

1. Clone the repo
2. Create `.env` file:

```
OPENAI_API_KEY=your_key_here
```

3. Install dependencies:
```
npm install
```

4. (Optional but recommended) Add an alias to `.zshrc`:
```
alias chat="ts-node /path/to/gf-chat/src/chat.ts"
```
Then reload terminal:
```
source ~/.zshrc
```

---

## Usage

### Basic chat
```
chat "hello"
```

### Use advanced reasoning model
```
chat --pro "help me plan a content schedule"
```

### Named sessions (keeps memory separate)
```
chat --session design "critique my layout"
chat --session stream "overlay ideas please"
```

---

## Notes & Learning

### Save full response as notes
```
chat --notes "explain typography contrast"
```
Saves to:
```
notes/<session>.md
```

### Save **structured learning notes** (recommended)
```
chat --notes-learn "explain visual hierarchy"
```
This generates:
- Core Idea
- Key Terms
- Main Principles
- How To Apply
- Encouragement

Perfect for studying / self-improvement.

---

## Cleanup

### Clear chat memory for a session
```
chat --clear              # clears 'main'
chat --clear design       # clears design session history
```

### Clear notes
```
chat --clear-notes        # clears notes for 'main'
chat --clear-notes growth
```

---

## Tips
- Use specific sessions so conversations stay organized
- Use `--notes-learn` when she learns something new
- If the assistant becomes "too verbose", remind it to be concise
- Feel free to adjust `context/index.md` to reflect personal guidance style

---

## Future Improvements (maybe)
- Small cozy web UI
- Voice input (`talk` mode)
- Automatic note indexing / search

---

## Motivation
This exists because sometimes the best tech is simply:
> _"I made a tool just for you."_

No subscriptions. No clutter. Just a helpful companion.
