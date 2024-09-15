# Makima

A Simpler Assistants API

## Why

OpenAI Assistants API is amazing but very specific to their service. Alternatives often try to copy their sdk compatibility along with the limitations (limited supported tools) and complexity (their Node SDK for assistants is a mess as of July 2024 at least).

Makima aims to simplify casual use cases, making it trivial for remote scripts and prototype programs to implement AI features in a simple way.

### Example Case

We have an assistant declared:

```json
[
  {
    "id": 1,
    "name": "makima",
    "prompt": "You take in errors that occur in a script and then you need to notify the user exactly the important part, or if it's verbose explain the error in the notification.",
    "model": "gpt-3.5-turbo"
  }
]
```

We have a thread called "server_logs" to use the assistant to add to this thread, it would require multiple calls using the assistants API. Makima simplifies this process to a single API call:

````bash
curl --request POST \
  --url http://localhost:7777/thread/auto \
  --header 'Content-Type: application/json' \
  --data '{
  "threadName": "server_logs",
  "assistantName": "makima",
  "message": {
    "content": "\n\n```\nJul 2 09:58:27 server kernel: [123456.789012] usb 1-1: new high-speed USB device number 7 using xhci_hcd\nJul 2 09:58:27 server kernel: [123456.789456] usb 1-1: New USB device found, idVendor=0781, idProduct=5567\nJul 2 09:58:27 server kernel: [123456.789789] usb 1-1: New USB device strings: Mfr=1, Product=2, SerialNumber=3\nJul 2 09:58:27 server kernel: [123456.789999] usb 1-1: Product: Cruzer Blade\nJul 2 09:58:27 server kernel: [123456.790123] usb 1-1: Manufacturer: SanDisk\nJul 2 09:58:27 server kernel: [123456.790456] usb 1-1: SerialNumber: 1234567890ABCDE\nJul 2 09:58:27 server kernel: [123456.791234] usb 1-1: can'\''t set config #1, error -32\n```\n"
  }
}'

````

Tool runs for notifying and updates the thread:

```json
{
  "id": 2,
  "threadId": 3,
  "role": "assistant",
  "createdAt": "2024-07-02T10:00:00.000Z",
  "content": null,
  "name": null,
  "tool_call": {
    "tool_name": "notify_discord",
    "parameters": {
      "message": "The error in the log is:\n\n`usb 1-1: can't set config #1, error -32`\n\nExplanation: The system tried to set the configuration for the USB device but encountered an error (`error -32`). This could be due to a hardware issue with the USB device or a compatibility problem with the USB controller. It might be worth trying a different USB port or device to see if the problem persists."
    }
  }
}
```

## Development setup

### Requirements

- Bun
- Docker

### Services Setup

```bash
mv sample.env .env.local # Add your own OpenAI key
docker compose -f ./docker/local-docker-compose.yml up -d
```

### Start Server

```bash
bun install
bun run dev
```

**Check the Swagger at `/swagger`**

### Project Structure

```
makima
├── drizzle.config.ts
src
├── db
│   ├── assistants.ts
│   ├── connection.ts
│   ├── migrate.ts
│   ├── redis.ts
│   ├── schema.ts # Schema file for Drizzle; should not contain any runtime code.
│   └── threads.ts
├── index.ts
├── lib
│   ├── env_validation.ts
│   ├── runners
│   │   └── thread.ts
│   └── tools
│       ├── functions # All tool files here will be auto-imported and registered
│       │   └── time.ts # All exports with type=function will be registered as tools
│       └── index.ts
└── routes
    ├── assistant.ts
    ├── threads-runner.ts
    └── threads.ts
└── tsconfig.json
```
