import { Elysia } from "elysia";
import { assistantRoute } from "./routes/assistant";
import { messagesRoutes, threadsRoute } from "./routes/threads";
import swagger from "@elysiajs/swagger";
import { ENV } from "./lib/env_validation";
import packagejson from "../package.json";
import { keyRoutes } from "./routes/keys";
import bearer from "@elysiajs/bearer";
import { verifyToken } from "./lib/keys/key-manager";
import { basicAuth } from "elysia-basic-auth";

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
    scalarConfig: {
      customCss: `body {background:var(--scalar-background-2);}`,
    },

    documentation: {
      info: {
        title: "Makima",
        version: `v${packagejson.version}`,
        contact: {
          name: "Raj Sharma",
          email: "r@raj.how",
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        {
          name: "Keys",
          description: `Routes for managing keys. This includes endpoints for generating and validating keys.
          All of these routes require the admin key to be passed as the bearer token.`,
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
        {
          name: "Utilites",
          description: "Routes for utility functions.",
        },
      ],
    },
  })
);

const adminAuth = new Elysia().use(bearer()).onBeforeHandle(({ bearer }) => {
  if (!bearer) {
    return "Unauthorized";
  }
  if (bearer === ENV.ADMIN_KEY) {
    return;
  }
  return "Unauthorized";
});

adminAuth.use(keyRoutes);

const authenticated = new Elysia();
authenticated.use(bearer()).onBeforeHandle(({ bearer, set }) => {
  console.log("onBeforeHandle bearer: ", bearer);
  if (!bearer) {
    set.status = 400;
    set.headers[
      "WWW-Authenticate"
    ] = `Bearer realm='sign', error="invalid_request"`;

    return "Unauthorized";
  }
  try {
    verifyToken(bearer);
  } catch (error) {
    set.status = 401;
    return "Unauthorized";
  }
});
authenticated.use(assistantRoute);
authenticated.use(threadsRoute);
authenticated.use(messagesRoutes);

main.use(adminAuth);
main.use(authenticated);

main.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
