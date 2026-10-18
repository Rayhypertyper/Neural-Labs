import { useId, useState } from "react";
import type { EpochMetrics } from "../types/game";
import { Help } from "./Help";

export default function ObservatoryCurve({
  epochs,
  previous,
  epoch,
  kind,
  onSeek,
}: {
  epochs: EpochMetrics[];
  previous?: EpochMetrics[];
  epoch: number;
  kind: "accuracy" | "loss";
  onSeek: (epoch: number) => void;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const all = [...epochs, ...(previous ?? [])];
  const maxEpoch = Math.max(1, ...all.map((m) => m.epoch));
  const ceiling =
    kind === "accuracy"
      ? 100
      : Math.max(
          0.1,
          ...all.map((m) => Math.max(m.trainLoss, m.validationLoss)),
        ) * 1.05;
  const floor =
    kind === "accuracy"
      ? Math.min(
          40,
          ...all.map((m) => Math.min(m.trainAccuracy, m.validationAccuracy)),
        )
      : 0;
  const x = (e: number) => 32 + (e / maxEpoch) * 250;
  const y = (v: number) => 112 - ((v - floor) / (ceiling - floor)) * 98;
  const path = (data: EpochMetrics[], train = false) =>
    data
      .map(
        (m, i) =>
          `${i ? "L" : "M"}${x(m.epoch).toFixed(1)},${y(kind === "accuracy" ? (train ? m.trainAccuracy : m.validationAccuracy) : train ? m.trainLoss : m.validationLoss).toFixed(1)}`,
      )
      .join(" ");
  const focused = epochs.find((m) => m.epoch === (hover ?? epoch));
  const seekAt = (clientX: number, el: SVGSVGElement) =>
    Math.max(
      0,
      Math.min(
        maxEpoch,
        Math.round(
          ((((clientX - el.getBoundingClientRect().left) /
            el.getBoundingClientRect().width) *
            300 -
            32) /
            250) *
            maxEpoch,
        ),
      ),
    );
  return (
    <Help
      id={kind === "accuracy" ? "accuracy" : "lossMetric"}
      as="div"
      className="observatory-chart"
    >
      <svg
        viewBox="0 0 300 140"
        role="img"
        aria-labelledby={id}
        onPointerMove={(e) => setHover(seekAt(e.clientX, e.currentTarget))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => onSeek(seekAt(e.clientX, e.currentTarget))}
      >
        <title id={id}>
          {kind === "accuracy" ? "Accuracy" : "Loss"} by epoch. Dashed purple is
          training, solid green is validation; dotted gray is the previous
          configuration. Use the epoch slider to inspect with a keyboard.
        </title>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1="32"
              x2="282"
              y1={112 - 98 * f}
              y2={112 - 98 * f}
              className="ob-chart-grid"
            />
            <text x="26" y={116 - 98 * f} textAnchor="end">
              {kind === "accuracy"
                ? Math.round(floor + (ceiling - floor) * f) + "%"
                : (ceiling * f).toFixed(1)}
            </text>
          </g>
        ))}
        {previous?.length ? (
          <path d={path(previous)} className="ob-curve previous" />
        ) : null}
        {epochs.length > 0 ? (
          <>
            <path d={path(epochs, true)} className="ob-curve train" />
            <path d={path(epochs)} className="ob-curve validation" />
          </>
        ) : (
          <text x="155" y="68" textAnchor="middle" className="ob-chart-empty">
            Waiting for an epoch
          </text>
        )}
        <line
          x1={x(hover ?? epoch)}
          x2={x(hover ?? epoch)}
          y1="12"
          y2="112"
          className="ob-chart-cursor"
        />
        {focused && (
          <circle
            cx={x(focused.epoch)}
            cy={y(
              kind === "accuracy"
                ? focused.validationAccuracy
                : focused.validationLoss,
            )}
            r="3.5"
            className="ob-chart-point"
          />
        )}
        <text x="32" y="132">
          0
        </text>
        <text x="157" y="132" textAnchor="middle">
          Epoch
        </text>
        <text x="282" y="132" textAnchor="end">
          {maxEpoch}
        </text>
      </svg>
      <div className="curve-readout">
        {focused
          ? `Epoch ${focused.epoch} · validation ${kind === "accuracy" ? `${focused.validationAccuracy.toFixed(1)}%` : focused.validationLoss.toFixed(3)}`
          : "Select an epoch to inspect"}
      </div>
    </Help>
  );
}
