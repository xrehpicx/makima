import { Elysia } from "elysia";
import { assistantRoute } from "./routes/assistant";
import { messagesRoutes, threadsRoute } from "./routes/threads";
import { Logestic } from "logestic";
import swagger from "@elysiajs/swagger";
import { ENV } from "./lib/env_validation";

const main = new Elysia().get("/", () => "makima running", {
  detail: {
    summary: "Get Health",
    description: `Get service status
    examples:
        curl -X GET http://localhost:7777/
        `,
  },
});

main.use(swagger());
main.use(Logestic.preset("common"));
main.use(assistantRoute);
main.use(threadsRoute);
main.use(messagesRoutes);

main.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
