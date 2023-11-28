# Makima

A chat bot with customizable interfaces it can be interacted through, with basic abilities of chatgpt plus with the added functionality of:

- Server Management (has full shell access)
- Scheduling Tasks
- Automatic memory optimiation by moving old sections of conversation content to vector store to save on token usage.

`it defaults to using gpt3.5-turbo but can be configured to auto switch to gpt-4 when needed or stay at gpt4`

To install dependencies:

```bash
npm install
```
Sticking with npm as it has better compatability with installing packages that need `libxmljs` / `node-gyp`

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.0.11. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

### Todo

[ x ] Move to architecture to agent architecture to save on prompt token size bloated by tool declarations

[ ] Make scheduling be tied to system cron.

[ ] Adding Support for audio and image input.

[ x ] Dockerize it

[ ] Adding plugin system for other interfaces
