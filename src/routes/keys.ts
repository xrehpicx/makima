import Elysia, { t } from "elysia";
import { generateToken, verifyToken } from "../lib/keys/key-manager";

export const keyRoutes = new Elysia({ prefix: "/key" });

keyRoutes.get(
  "/",
  ({ query }) => {
    try {
      return verifyToken(query.key);
    } catch (error) {
      throw new Error("Invalid Key");
    }
  },
  {
    query: t.Object({
      key: t.String(),
    }),

    detail: {
      summary: "Validate Key",
      description: "Verify a jwt token, using the admin key",
      tags: ["Keys"],
    },
  }
);

keyRoutes.post(
  "/",
  async ({ body }) => {
    return generateToken(body.payload, body.expiresIn);
  },
  {
    body: t.Object({
      payload: t.Any(),
      expiresIn: t.String(),
    }),
    detail: {
      summary: "Generate Key",
      description:
        "Generate a jwt token, with use case specific payload and expiration time using the admin key",
      tags: ["Keys"],
    },
  }
);
