import { useEffect, useRef } from "preact/hooks";
import type { RepRecord } from "../tracker/rep-tracker";

interface RepGraphProps {
  repData: RepRecord[];
}

export function RepGraph({ repData }: RepGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || repData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set up dimensions
    const padding = 40;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;

    // Group reps by minute
    const repsByMinute = new Map<number, number>();
    repData.forEach((data) => {
      const minute = Math.floor(data.timestamp / 60000);
      repsByMinute.set(minute, (repsByMinute.get(minute) || 0) + 1);
    });

    // Convert to array and sort by minute
    const minuteData = Array.from(repsByMinute.entries()).sort(
      ([a], [b]) => a - b
    );

    // Find max reps in any minute
    const maxReps = Math.max(...minuteData.map(([_, count]) => count));

    // Draw axes
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw y-axis labels (total reps)
    ctx.fillStyle = "#666";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yStep = Math.max(1, Math.ceil(maxReps / 5));
    for (let i = 0; i <= maxReps; i += yStep) {
      const y = canvas.height - padding - (i / maxReps) * graphHeight;
      ctx.fillText(i.toString(), padding - 5, y);
      // Draw horizontal grid line
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.strokeStyle = "#333";
      ctx.stroke();
    }

    // Draw x-axis labels (minutes)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const totalMinutes = Math.max(...minuteData.map(([minute]) => minute)) + 1;
    const xStep = Math.max(1, Math.ceil(totalMinutes / 5));
    for (let i = 0; i <= totalMinutes; i += xStep) {
      const x = padding + (i / totalMinutes) * graphWidth;
      ctx.fillText(i.toString(), x, canvas.height - padding + 5);
      // Draw vertical grid line
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvas.height - padding);
      ctx.strokeStyle = "#333";
      ctx.stroke();
    }

    // Draw axis labels
    ctx.save();
    ctx.translate(padding - 30, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Total Reps", 0, 0);
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Time (minutes)", canvas.width / 2, canvas.height - 10);

    // Draw data points and lines
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 2;
    ctx.beginPath();

    minuteData.forEach(([minute, count], index) => {
      const x = padding + (minute / totalMinutes) * graphWidth;
      const y = canvas.height - padding - (count / maxReps) * graphHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Draw data point
      ctx.fillStyle = "#4CAF50";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.stroke();
  }, [repData]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={320}
      style={{
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        marginTop: "1rem",
      }}
    />
  );
}
