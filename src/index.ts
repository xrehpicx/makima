import { Elysia } from "elysia";
import { assistantRoute } from "./routes/assistant";
import { messagesRoutes, threadsRoute } from "./routes/threads";
import { Logestic } from "logestic";

const main = new Elysia().get("/", () => "makima running");

main.use(Logestic.preset("common"));
main.use(assistantRoute);
main.use(threadsRoute);
main.use(messagesRoutes);

main.listen(6666, () => {
  console.log("Server running on port 6666");
});
