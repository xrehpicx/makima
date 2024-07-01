# Makima

Simpler alternative to openai assistants api

### Why
Openai assistants api is awesome but very specific to their service and alternatives try to copy their compatibility along with the limitation (limited supported tools) and complexity (their node sdk for assistants is a mess as of July 2024) of the api.

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
