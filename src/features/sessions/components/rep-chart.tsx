import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WorkoutMetadata } from "../../../service/storage.service";
import styles from "./rep-chart.module.css";

interface RepChartProps {
  session: WorkoutMetadata;
}

interface RepData {
  minute: number;
  reps: number;
}

export function RepChart({ session }: RepChartProps) {
  const generateChartData = (): RepData[] => {
    const repsPerMinuteData: RepData[] = [];
    const repsPerMinute = new Map<number, number>();

    // Calculate reps per minute
    session.reps.forEach((rep) => {
      const minute = Math.floor((rep.timestamp - session.timestamp) / 60000);
      repsPerMinute.set(minute, (repsPerMinute.get(minute) || 0) + 1);
    });

    // Fill in all minutes with 0 if no reps
    const totalMinutes = Math.ceil(session.duration / 60000);
    for (let i = 0; i < totalMinutes; i++) {
      repsPerMinuteData.push({
        minute: i + 1,
        reps: repsPerMinute.get(i) || 0,
      });
    }

    return repsPerMinuteData;
  };

  const chartData = generateChartData();

  return (
    <div className={styles.chart}>
      <div className={styles.chartTitle}>Reps per Minute</div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="minute"
            tickFormatter={(value: any) => `${value}m`}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(value: any) => `Minute ${value}`}
            formatter={(value: any) => [`${value}`, 'Reps']}
          />
          <Line 
            type="monotone" 
            dataKey="reps" 
            stroke="var(--primary-color)" 
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}