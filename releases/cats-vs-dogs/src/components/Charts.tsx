import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { EpochMetrics } from "../types/game";
import { Explain, Help } from "./Help";
export function LearningChart({
  epochs,
  kind = "accuracy",
  compact = false,
}: {
  epochs: EpochMetrics[];
  kind?: "accuracy" | "loss";
  compact?: boolean;
}) {
  const accuracy = kind === "accuracy";
  return (
    <Help
      id="lossMetric"
      as="div"
      className={`chart-shell ${compact ? "compact" : ""}`}
    >
      <div className="chart-heading">
        <h3>
          {accuracy ? "Accuracy over time" : "Loss over time"}{" "}
          <Explain id="lossMetric" />
        </h3>
        <div className="legend">
          <span>
            <i />
            Train
          </span>
          <span>
            <i className="validation" />
            Validation
          </span>
        </div>
      </div>
      <div className="chart" style={{ height: compact ? 170 : 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={epochs}
            margin={{ top: 12, right: 8, left: -18, bottom: 2 }}
          >
            <CartesianGrid
              strokeDasharray="3 5"
              vertical={false}
              stroke="#e8edf0"
            />
            <XAxis
              dataKey="epoch"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#647783" }}
              minTickGap={20}
            />
            <YAxis
              domain={accuracy ? [40, 100] : [0, "auto"]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#647783" }}
              tickFormatter={(n) => (accuracy ? `${n}%` : n.toFixed(1))}
            />
            <Tooltip
              contentStyle={{
                border: "none",
                boxShadow: "0 8px 24px #14233415",
                borderRadius: 10,
                fontSize: 12,
              }}
              labelFormatter={(l) => `Epoch ${l}`}
              formatter={(v: any) =>
                accuracy ? `${Number(v).toFixed(1)}%` : Number(v).toFixed(3)
              }
            />
            {accuracy && (
              <ReferenceLine y={90} stroke="#b9c5ce" strokeDasharray="5 5" />
            )}
            <Line
              type="monotone"
              dataKey={accuracy ? "trainAccuracy" : "trainLoss"}
              name="Train"
              stroke="#8495e2"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={accuracy ? "validationAccuracy" : "validationLoss"}
              name="Validation"
              stroke="#22968a"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-axis-label">EPOCH</div>
    </Help>
  );
}
