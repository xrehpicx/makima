# Makima

Simpler alternative to openai assistants api

### Why
Openai assistants api is awesome but very specific to their service and alternatives try to copy their compatibility along with the limitation (limited supported tools) and complexity (their node sdk for assistants is a mess as of July 2024) of the api.

Example Case:

We have a assistant declared:
```json
[
  {
    "id": 3,
    "name": "makima",
    "prompt": "You translate everything to simple japanese while also explaning the translation after u translate",
    "model": "gpt-3.5-turbo",
  }
]
```

We have a thread (id=1) with messages:
```json
[
  {
    "id": 1,
    "threadId": 1,
    "createdAt": "2024-07-01T13:54:49.950Z",
    "role": "user",
    "content": "hey this is a test message",
    "tool_call_id": null,
    "tool_calls": null,
    "name": null
  },
  {
    "id": 2,
    "threadId": 1,
    "createdAt": "2024-07-01T13:55:21.953Z",
    "role": "user",
    "content": "hey this is another test message",
    "tool_call_id": null,
    "tool_calls": null,
    "name": null
  },
  {
    "id": 3,
    "threadId": 1,
    "createdAt": "2024-07-01T16:01:16.042Z",
    "role": "user",
    "content": "who is the pm of india",
    "tool_call_id": null,
    "tool_calls": null,
    "name": null
  }
```

To use the assistant to add to this thread it would require multiple calls using assistants api, the point here is to simply casual use-cases making it trivial for remote scripts and prototype programs to implement ai features in a simple way, with makima this becomes a single api call:
```bash
curl --request POST \
  --url http://localhost:6666/thread/auto \
  --header 'Content-Type: application/json' \
  --data '{
  "threadId": 1,
  "assistantId": 3,
  "message": {
    "content": "whats the time right now and what was my previous question"
  }
}'
```

simple text response:
```
The current date and time is July 1, 2024, 10:38:39 PM. Your previous question was "who is the pm of india".
```

## TODO:

[ ] Write some docs
[ ] Implement Documents and file system
[ ] Implement api keys system
[ ] Client side tools system
[ ] Implement context param for tools
[ ] Web socket supports for listening to threads
[ ] Support all hosting methods

## CONTRIBUTION DOC (for now):

This project requires:

- Bun
- PGVector
- Redis

### Services setup

```
mv smaple.env .env.local # add ur own openai key
docker compose -f ./docker/local-docker-compose.yml up -d
```

### Start server

```bash
bun install
```

To run:

```bash
bun run dev
```

General fs:

```
makima
├── drizzle.config.ts
src
├── db # Everything db related
│   ├── assistants.ts
│   ├── connection.ts
│   ├── migrate.ts
│   ├── redis.ts
│   ├── schema.ts # this is the schema file for drizzle, this should not contain any run time code.
│   └── threads.ts
├── index.ts
├── lib
│   ├── env_validation.ts
│   ├── runners
│   │   └── thread.ts
│   └── tools
│       ├── functions # all tools files in this will be auto imported and registered
│       │   └── time.ts # all exports that have type = function will be registered as tools see this example
│       └── index.ts
└── routes
    ├── assistant.ts
    ├── threads-runner.ts
    └── threads.ts
└── tsconfig.json
```
