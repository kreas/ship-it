import { Inngest, EventSchemas } from "inngest";

// Define typed events for compile-time safety
export type Events = {
  "app/hello.world": {
    data: {
      message: string;
      userId?: string;
    };
  };
};

export const inngest = new Inngest({
  id: "auto-kanban",
  schemas: new EventSchemas().fromRecord<Events>(),
});
