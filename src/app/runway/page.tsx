// TODO: Re-enable auth when deployed to Vercel
// import { requireActiveUser } from "@/lib/actions/workspace";
import { getClientsWithProjects, getWeekItems, getPipeline } from "./queries";
import { RunwayBoard } from "./runway-board";

export const metadata = {
  title: "Runway — Civilization Agency",
};

export const dynamic = "force-dynamic";

export default async function RunwayPage() {
  // Auth disabled for local dev (WorkOS callback is port-bound to 3000)
  // await requireActiveUser();

  const [clientsWithProjects, allWeekItems, pipelineData] = await Promise.all([
    getClientsWithProjects(),
    getWeekItems(),
    getPipeline(),
  ]);

  // Split week items into thisWeek (current week) and upcoming
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const currentWeekOf = monday.toISOString().split("T")[0];

  const thisWeek = allWeekItems.filter((d) => {
    const itemDate = new Date(d.date + "T12:00:00");
    const itemMonday = new Date(itemDate);
    const iday = itemDate.getDay();
    itemMonday.setDate(itemDate.getDate() - iday + (iday === 0 ? -6 : 1));
    return itemMonday.toISOString().split("T")[0] === currentWeekOf;
  });

  const upcoming = allWeekItems.filter((d) => {
    const itemDate = new Date(d.date + "T12:00:00");
    const itemMonday = new Date(itemDate);
    const iday = itemDate.getDay();
    itemMonday.setDate(itemDate.getDate() - iday + (iday === 0 ? -6 : 1));
    return itemMonday.toISOString().split("T")[0] > currentWeekOf;
  });

  // Map DB shape to component props
  const accounts = clientsWithProjects.map((client) => ({
    name: client.name,
    slug: client.slug,
    contractValue: client.contractValue ?? undefined,
    contractTerm: client.contractTerm ?? undefined,
    contractStatus: (client.contractStatus ?? "signed") as
      | "signed"
      | "unsigned"
      | "expired",
    team: client.team ?? undefined,
    items: client.items.map((p) => ({
      id: p.id,
      title: p.name,
      status: (p.status ?? "not-started") as import("./data").ItemStatus,
      category: (p.category ?? "active") as import("./data").ItemCategory,
      owner: p.owner ?? undefined,
      waitingOn: p.waitingOn ?? undefined,
      target: p.target ?? undefined,
      notes: p.notes ?? undefined,
      staleDays: p.staleDays ?? undefined,
    })),
  }));

  const pipelineProps = pipelineData.map((p) => ({
    account: p.accountName ?? "",
    title: p.name,
    value: p.estimatedValue ?? "TBD",
    status: (p.status ?? "no-sow") as
      | "sow-sent"
      | "drafting"
      | "no-sow"
      | "verbal",
    waitingOn: p.waitingOn ?? undefined,
    notes: p.notes ?? undefined,
  }));

  return (
    <RunwayBoard
      thisWeek={thisWeek}
      upcoming={upcoming}
      accounts={accounts}
      pipeline={pipelineProps}
    />
  );
}
