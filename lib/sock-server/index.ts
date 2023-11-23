import net from "net";
import fs from "fs";

const socketPath = "./makima.sock";

try {
  fs.unlinkSync(socketPath);
} catch (err) {}

export function init_sock_server(onMessage: (data: string) => void) {
  const server = net.createServer((connection) => {
    connection.on("data", (data) => {
      console.log(data);
      onMessage(data.toString());
    });

    connection.on("end", () => {
      console.log("sock client disconnected");
    });
  });

  server.listen(socketPath, () => {
    console.log(`Server listening on ${socketPath}`);
  });
  return server;
}
