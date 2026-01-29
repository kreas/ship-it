"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DailyUsage } from "@/lib/actions/token-usage";

interface UsageChartProps {
  data: DailyUsage[];
}

const chartConfig = {
  Haiku: {
    label: "Haiku",
    color: "var(--chart-1)",
  },
  Sonnet: {
    label: "Sonnet",
    color: "var(--chart-2)",
  },
  Opus: {
    label: "Opus",
    color: "var(--chart-3)",
  },
  Other: {
    label: "Other",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function UsageChart({ data }: UsageChartProps) {
  // Format data for the chart - flatten byModel into top-level fields
  const chartData = data.map((d) => ({
    date: d.date,
    Haiku: d.byModel.Haiku || 0,
    Sonnet: d.byModel.Sonnet || 0,
    Opus: d.byModel.Opus || 0,
    Other: d.byModel.Other || 0,
  }));

  // Determine which models have any data
  const hasHaiku = data.some((d) => d.byModel.Haiku);
  const hasSonnet = data.some((d) => d.byModel.Sonnet);
  const hasOpus = data.some((d) => d.byModel.Opus);
  const hasOther = data.some((d) => d.byModel.Other);

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          }}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <ChartLegend content={<ChartLegendContent />} />
        {hasHaiku && (
          <Bar
            dataKey="Haiku"
            stackId="a"
            fill="var(--color-Haiku)"
            radius={[0, 0, 0, 0]}
          />
        )}
        {hasSonnet && (
          <Bar
            dataKey="Sonnet"
            stackId="a"
            fill="var(--color-Sonnet)"
            radius={[0, 0, 0, 0]}
          />
        )}
        {hasOpus && (
          <Bar
            dataKey="Opus"
            stackId="a"
            fill="var(--color-Opus)"
            radius={[0, 0, 0, 0]}
          />
        )}
        {hasOther && (
          <Bar
            dataKey="Other"
            stackId="a"
            fill="var(--color-Other)"
            radius={[4, 4, 0, 0]}
          />
        )}
      </BarChart>
    </ChartContainer>
  );
}
