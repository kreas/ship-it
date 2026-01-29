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
  inputTokens: {
    label: "Input Tokens",
    color: "hsl(262, 83%, 58%)", // Purple
  },
  outputTokens: {
    label: "Output Tokens",
    color: "hsl(24, 95%, 53%)", // Orange
  },
} satisfies ChartConfig;

export function UsageChart({ data }: UsageChartProps) {
  // Filter to only days with data for better visualization
  const daysWithData = data.filter((d) => d.totalTokens > 0);

  // Check if there's any data
  const hasData = daysWithData.length > 0;

  if (!hasData) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No usage data yet</p>
          <p className="text-xs mt-1">
            Token usage will appear here as you use AI features
          </p>
        </div>
      </div>
    );
  }

  // Format data for the chart - show only days with data or last 14 days if there's sparse data
  const chartData = (daysWithData.length < 5 ? daysWithData : data.slice(-14)).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    inputTokens: d.inputTokens,
    outputTokens: d.outputTokens,
  }));

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart
        accessibilityLayer
        data={chartData}
        margin={{ left: 12, right: 12, top: 12 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
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
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="inputTokens"
          fill="var(--color-inputTokens)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="outputTokens"
          fill="var(--color-outputTokens)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
