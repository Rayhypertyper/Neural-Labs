import { useId } from "react";
import {
  networkLayers,
  type NetworkLayer,
  type TrainingPhase,
} from "../game/observatory";
import type { ExperimentConfig } from "../types/game";
import { useInspector } from "./Help";

export default function NetworkDiagram({
  config,
  active,
  phase,
  selected,
  onSelect,
  detailed,
  pruning = 0,
}: {
  config: ExperimentConfig;
  active: boolean;
  phase: TrainingPhase;
  selected: string;
  onSelect: (id: string) => void;
  detailed: boolean;
  pruning?: number;
}) {
  const education = useInspector();
  const uid = useId().replace(/:/g, "");
  const all = networkLayers(config);
  const outputId = all.at(-1)?.kind === "dense" ? all.at(-1)?.id : null;
  const groups: (NetworkLayer & { members: NetworkLayer[] })[] = [];
  for (const l of all) {
    if (
      !detailed &&
      ["relu", "pool", "norm", "dropout"].includes(l.kind) &&
      groups.length > 1
    )
      groups.at(-1)!.members.push(l);
    else groups.push({ ...l, members: [l] });
  }
  const width = Math.max(340, groups.length * (detailed ? 66 : 72));
  const step = (width - 62) / Math.max(1, groups.length - 1);
  const counts = groups.map((g) =>
    g.kind === "input"
      ? 3
      : g.kind === "dense"
        ? Math.min(5, g.units)
        : Math.min(6, Math.max(2, Math.ceil(Math.log2(g.units + 1)))),
  );
  const nodes = groups.map((g, i) => ({
    ...g,
    x: 31 + i * step,
    ys: Array.from(
      { length: counts[i] },
      (_, j) => 65 + (j - (counts[i] - 1) / 2) * 14,
    ),
  }));
  const reverse = phase === "backward";
  return (
    <div
      className={`network-diagram ${active ? "is-flowing" : ""} phase-${phase}`}
    >
      <div
        className="network-scroll"
        tabIndex={0}
        role="group"
        aria-label="Interactive network diagram. Select a layer to inspect it; scroll horizontally for more layers."
      >
        <svg
          viewBox={`0 0 ${width} 142`}
          style={{ minWidth: width }}
          aria-label={`${config.architecture.name}: ${all.length - 1} layers, ${config.dataset.resolution} pixel inputs, ${config.training.dropout * 100}% dropout. Representative units, not measured activations.`}
        >
          <defs>
            <marker
              id={`arrow-${uid}`}
              viewBox="0 0 8 8"
              refX="6"
              refY="4"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0 0L8 4L0 8" fill="currentColor" />
            </marker>
          </defs>
          {nodes
            .slice(1)
            .flatMap((target, i) =>
              nodes[i].ys.flatMap((y, j) =>
                target.ys.map((ty, k) => (
                  <path
                    key={`${target.id}-${j}-${k}`}
                    className={`network-wire ${pruning > 0 && (j * 7 + k * 13) % 100 < pruning ? "pruned" : ""}`}
                    d={`M ${nodes[i].x + 5} ${y} C ${nodes[i].x + step / 2} ${y}, ${target.x - step / 2} ${ty}, ${target.x - 5} ${ty}`}
                  />
                )),
              ),
            )}
          {nodes.slice(1).map((target, i) => (
            <path
              key={`flow-${target.id}`}
              className="network-signal"
              style={{ animationDelay: `${i * -0.2}s` }}
              d={
                reverse
                  ? `M ${target.x - 8} 65 H ${nodes[i].x + 8}`
                  : `M ${nodes[i].x + 8} 65 H ${target.x - 8}`
              }
              markerEnd={`url(#arrow-${uid})`}
            />
          ))}
          {nodes.map((g) => {
            const chosen = g.members.some((m) => m.id === selected);
            const drop =
              g.members.some((m) => m.kind === "dropout") ||
              (g.kind !== "input" &&
                g.kind !== "dense" &&
                config.training.dropout > 0);
            return (
              <g
                key={g.id}
                role="button"
                data-help={
                  g.kind === "input" ? "resolution" : `layer.${g.kind}`
                }
                onMouseEnter={(event) =>
                  education.hover(
                    g.kind === "input" ? "resolution" : `layer.${g.kind}`,
                    event.currentTarget.getBoundingClientRect(),
                  )
                }
                onMouseLeave={education.leave}
                onFocus={(event) =>
                  education.hover(
                    g.kind === "input" ? "resolution" : `layer.${g.kind}`,
                    event.currentTarget.getBoundingClientRect(),
                  )
                }
                onBlur={education.leave}
                tabIndex={0}
                aria-label={`Inspect ${g.name}: ${g.detail}${g.members.length > 1 ? `, ${g.members.length} layers in block` : ""}`}
                aria-pressed={chosen}
                className={`network-node ${chosen ? "selected" : ""}`}
                onClick={() => onSelect(g.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(g.id);
                  }
                }}
              >
                <title>
                  {g.members
                    .map((m) => `${m.name}: ${m.detail} → ${m.shape}`)
                    .join("\n")}
                </title>
                <rect
                  className="network-hit"
                  x={g.x - 26}
                  y="7"
                  width="52"
                  height="119"
                  rx="8"
                />
                {g.ys.map((y, j) => {
                  const off =
                    phase !== "validate" &&
                    drop &&
                    j / g.ys.length < config.training.dropout;
                  return (
                    <g
                      key={j}
                      className={off ? "network-unit dropped" : "network-unit"}
                    >
                      <circle cx={g.x} cy={y} r={g.kind === "input" ? 6 : 5} />
                      {off && (
                        <path d={`M ${g.x - 2} ${y - 2} l 4 4 m 0 -4 l -4 4`} />
                      )}
                    </g>
                  );
                })}
                <text
                  x={g.x}
                  y="116"
                  textAnchor="middle"
                  className="network-label"
                >
                  {g.kind === "conv"
                    ? `${g.units} filters`
                    : g.kind === "input"
                      ? "Images"
                      : g.kind === "dense"
                        ? `${g.units} ${g.id === outputId ? "classes" : "units"}`
                        : g.name}
                </text>
                <text
                  x={g.x}
                  y="136"
                  textAnchor="middle"
                  className="network-sublabel"
                >
                  {g.members.length > 1
                    ? `+ ${g.members.length - 1} ${g.members.length === 2 ? "layer" : "layers"}`
                    : g.kind === "input"
                      ? `${config.dataset.resolution}² RGB`
                      : g.kind === "dense" && g.id === outputId && g.units === 2
                        ? "Cat / Dog"
                        : g.shape.replace(" features", "")}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="network-caption">
        <span>
          <i className="unit-key" />
          Representative units
        </span>
        <span>
          <i className="unit-key muted" />
          Dropout {Math.round(config.training.dropout * 100)}%
          {phase === "validate" ? " · off for validation" : ""}
        </span>
      </div>
    </div>
  );
}
