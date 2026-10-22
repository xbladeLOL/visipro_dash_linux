import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { workerTick } from "../src/lib/email/worker";

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
async function main() {
  console.info(
    "VisiPro email worker started; mode:",
    process.env.EMAIL_DELIVERY_MODE ?? "simulation",
  );
  while (!stopping) {
    try {
      await workerTick();
    } catch {
      console.error(
        "Email worker: configuration, database or dispatch failure. No secrets logged; inspect dashboard and configuration.",
      );
    }
    for (let i = 0; i < 30 && !stopping; i++)
      await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  await prisma.$disconnect();
}
main().catch(async () => {
  console.error("Email worker stopped");
  await prisma.$disconnect();
  process.exitCode = 1;
});
