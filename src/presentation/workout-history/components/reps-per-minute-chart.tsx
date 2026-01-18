import { WorkoutMetadata } from "@/domain/types/workout-storage.types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import styles from "./reps-per-minute-chart.module.css";

interface RepsPerMinuteChartProps {
  metadata: WorkoutMetadata;
}

interface MinuteData {
  minute: number;
  left: number;
  right: number;
  both: number;
  total: number;
}

const groupRepsByMinute = (
  reps: Array<{ timestamp: number; hand: string }>,
  startTime: string
): MinuteData[] => {
  const startMs = new Date(startTime).getTime();
  const minuteBuckets = new Map<
    number,
    { left: number; right: number; both: number }
  >();

  reps.forEach((rep) => {
    const minuteIndex = Math.floor((rep.timestamp - startMs) / 60000);
    if (!minuteBuckets.has(minuteIndex)) {
      minuteBuckets.set(minuteIndex, { left: 0, right: 0, both: 0 });
    }
    const bucket = minuteBuckets.get(minuteIndex)!;
    bucket[rep.hand as "left" | "right" | "both"]++;
  });

  // Convert to array and fill gaps, calculate total
  const maxMinute = Math.max(...Array.from(minuteBuckets.keys()), 0);
  return Array.from({ length: maxMinute + 1 }, (_, i) => {
    const bucket = minuteBuckets.get(i) || { left: 0, right: 0, both: 0 };
    return {
      minute: i + 1,
      ...bucket,
      total: bucket.left + bucket.right + bucket.both,
    };
  });
};

export function RepsPerMinuteChart({ metadata }: RepsPerMinuteChartProps) {
  const data = groupRepsByMinute(metadata.reps, metadata.startTime);

  if (data.length === 0 || metadata.totalReps === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No rep data available for this workout</p>
      </div>
    );
  }

  // Determine which series have data
  const hasLeft = data.some((d) => d.left > 0);
  const hasRight = data.some((d) => d.right > 0);
  const hasBoth = data.some((d) => d.both > 0);

  // Count how many series exist
  const seriesCount = [hasLeft, hasRight, hasBoth].filter(Boolean).length;

  // Only show total if there's more than one series
  const showTotal = seriesCount > 1;

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>Reps Per Minute</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.1)"
          />
          <XAxis
            dataKey="minute"
            stroke="rgba(255, 255, 255, 0.7)"
            label={{ value: "Minute", position: "insideBottom", offset: -10 }}
          />
          <YAxis
            stroke="rgba(255, 255, 255, 0.7)"
            label={{ value: "Reps", angle: -90, position: "insideLeft" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(32, 32, 32, 0.95)",
              border: "1px solid rgba(128, 128, 128, 0.3)",
              borderRadius: "8px",
            }}
          />
          {hasLeft && (
            <Line
              type="monotone"
              dataKey="left"
              stroke="#16a34a"
              name="Left Hand"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          {hasRight && (
            <Line
              type="monotone"
              dataKey="right"
              stroke="#ef4444"
              name="Right Hand"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          {hasBoth && (
            <Line
              type="monotone"
              dataKey="both"
              stroke="#16a34a"
              name="Both Hands"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          {showTotal && (
            <Line
              type="monotone"
              dataKey="total"
              stroke="#f59e0b"
              name="Total"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
