import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

async function startServer() {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(
      `DocuMind API running in ${env.nodeEnv} mode at http://localhost:${env.port}`
    );
  });

  function shutdown(signal) {
    console.log(`\n${signal} received. Closing server...`);

    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer();