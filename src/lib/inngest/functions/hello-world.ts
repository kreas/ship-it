import { inngest } from "../client";

export const helloWorld = inngest.createFunction(
  {
    id: "hello-world",
    name: "Hello World Test",
    retries: 3,
  },
  { event: "app/hello.world" },
  async ({ event, step }) => {
    // Step 1: Create greeting (durable checkpoint)
    const greeting = await step.run("create-greeting", async () => {
      console.log(`[Inngest] Received: ${event.data.message}`);
      return `Hello! Message: "${event.data.message}"`;
    });

    // Step 2: Demonstrate sleep (survives function restarts)
    await step.sleep("wait-a-moment", "5s");

    // Step 3: Process and return result
    const result = await step.run("process-message", async () => {
      return {
        greeting,
        processedAt: new Date().toISOString(),
        userId: event.data.userId ?? "anonymous",
      };
    });

    console.log(`[Inngest] Completed:`, result);
    return result;
  }
);
