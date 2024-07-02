import { Elysia } from "elysia";
import { assistantRoute } from "./routes/assistant";
import { messagesRoutes, threadsRoute } from "./routes/threads";
import { Logestic } from "logestic";
import swagger from "@elysiajs/swagger";
import { ENV } from "./lib/env_validation";
import packagejson from "../package.json";

const main = new Elysia().get("/", () => "makima running", {
  detail: {
    summary: "Get Health",
    description: `Get service status`,
    tags: ["Utilites"],
  },
});

main.use(
  swagger({
    autoDarkMode: true,
    documentation: {
      info: {
        title: "Makima",
        version: `v${packagejson.version}`,
      },
      tags: [
        {
          name: "Utilites",
          description: "Routes for utility functions.",
        },
        {
          name: "Assistant",
          description:
            "Routes for interacting with the assistant. This includes endpoints for sending messages, getting responses, and managing assistant settings.",
        },
        {
          name: "Threads",
          description:
            "Routes for managing threads. This includes endpoints for creating threads, retrieving thread information, and updating thread settings.",
        },
        {
          name: "Auto threads",
          description:
            "Routes for automatically managing threads. This includes endpoints for automatically creating and managing threads based on certain conditions or triggers.",
        },
        {
          name: "Messages",
          description:
            "Routes for managing messages. This includes endpoints for sending, retrieving, and deleting messages.",
        },
      ],
    },
  })
);
main.use(Logestic.preset("common"));
main.use(assistantRoute);
main.use(threadsRoute);
main.use(messagesRoutes);

main.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
