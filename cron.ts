import net from "net";
import { $ } from "zx";
const socketPath = "./makima.sock";

$`touch ./works`;

const client = net.createConnection({ path: socketPath }, () => {
  console.log("Connected to server");
});

client.on("data", (data) => {
  console.log("Received data:", data.toString());
});

client.on("end", () => {
  console.log("Disconnected from server");
});
