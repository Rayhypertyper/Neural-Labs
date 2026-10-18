import { useEffect, useMemo, useState } from "react";
import { Background, Handle, Position, ReactFlow } from "@xyflow/react";
import type { NodeProps, ReactFlowInstance } from "@xyflow/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Layers3,
  Plus,
  Trash2,
} from "lucide-react";
import { useGame, currentConfig } from "../store/gameStore";
import { estimate, validateArchitecture } from "../game/economy";
import { LAYER_NAMES, PRESETS, layer, money } from "../game/catalog";
import type { Layer, LayerKind } from "../types/game";
import { Button, Field, SectionHeading, Select, StageHeading } from "./ui";
import { Explain, Help } from "./Help";
function ArchitectureNode({ data, selected }: NodeProps) {
  return (
    <Help id={data.kind === "input" ? "resolution" : `layer.${data.kind}`}>
      <div
        className={`architecture-node ${data.kind} ${selected ? "selected" : ""}`}
      >
        <Handle type="target" position={Position.Left} />
        <div className="node-icon">
          <Layers3 size={15} />
        </div>
        <div>
          <strong>{String(data.label)}</strong>
          <span>{String(data.detail)}</span>
        </div>
        <Handle type="source" position={Position.Right} />
      </div>
    </Help>
  );
}
const nodeTypes = { architecture: ArchitectureNode };
export default function ModelBuilder() {
  const s = useGame();
  const [selected, setSelected] = useState(s.architecture.layers[0]?.id ?? "");
  const [addKind, setAddKind] = useState<LayerKind>("conv");
  const [flow, setFlow] = useState<Pick<
    ReactFlowInstance,
    "setCenter" | "getZoom"
  > | null>(null);
  const [feedback, setFeedback] = useState("");
  const a = s.architecture;
  const selectedIndex = a.layers.findIndex((item) => item.id === selected);
  const l = a.layers.find((l) => l.id === selected);
  const locked = !!s.running || !!s.evaluation;
  const est = estimate(currentConfig(s));
  const errors = validateArchitecture(a);
  useEffect(() => {
    if (!flow || selectedIndex < 0) return;
    void flow.setCenter(230 + selectedIndex * 198 + 84, 142, {
      zoom: flow.getZoom(),
    });
  }, [flow, selected, selectedIndex]);
  const nodes = useMemo(
    () => [
      {
        id: "input",
        type: "architecture",
        position: { x: 25, y: 104 },
        data: {
          label: "Input",
          detail: `${s.dataset.resolution} × ${s.dataset.resolution} × 3`,
          kind: "input",
        },
        draggable: false,
      },
      ...a.layers.map((l, i) => ({
        id: l.id,
        type: "architecture",
        position: { x: 230 + i * 198, y: 104 },
        selected: selected === l.id,
        data: {
          label: LAYER_NAMES[l.kind],
          detail:
            l.kind === "conv"
              ? `${l.width} filters · ${l.kernel} × ${l.kernel}`
              : l.kind === "dense"
                ? `${l.width} outputs`
                : l.kind === "relu"
                  ? l.activation
                  : l.kind === "dropout"
                    ? `${Math.round(s.training.dropout * 100)}% rate`
                    : l.kind === "pool"
                      ? "2 × 2 · stride 2"
                      : l.kind === "norm"
                        ? "Normalize feature channels"
                        : "Spatial average",
          kind: l.kind,
        },
        draggable: false,
      })),
    ],
    [a, s.dataset.resolution, s.training.dropout, selected],
  );
  const edges = nodes.slice(1).map((n, i) => ({
    id: `edge-${i}`,
    source: nodes[i].id,
    target: n.id,
    type: "smoothstep",
    style: { stroke: "#bdc9d3", strokeWidth: 2 },
  }));
  const update = (change: Partial<Layer>) => {
    if (l && !locked) {
      s.setArchitecture({
        ...a,
        name: "Custom CNN",
        layers: a.layers.map((x) => (x.id === l.id ? { ...x, ...change } : x)),
      });
      setFeedback(`Updated layer ${selectedIndex + 1}. Changes saved.`);
    }
  };
  const move = (step: number) => {
    if (!l || locked) return;
    const idx = a.layers.indexOf(l);
    const next = [...a.layers];
    if (idx + step < 0 || idx + step >= next.length) return;
    [next[idx], next[idx + step]] = [next[idx + step], next[idx]];
    s.setArchitecture({ name: "Custom CNN", layers: next });
    setFeedback(
      `Moved ${LAYER_NAMES[l.kind]} to layer ${idx + step + 1}. Changes saved.`,
    );
  };
  return (
    <>
      <StageHeading
        title="Give your model a shape."
        description="Start with a CNN. Then make every layer your own."
        action={
          <span className="simulation-tag">
            <Layers3 size={14} />
            {a.name}
          </span>
        }
      />
      <SectionHeading
        title="Choose your starting point"
        description={
          s.running
            ? "Choose a preset to start a new model. Your current run will stop, completed checkpoints will be saved, and unused compute will be refunded."
            : "Choose a preset to start a new model. Previous experiments and evaluations stay in Results."
        }
      />
      <div className="preset-list">
        {PRESETS.map((p, i) => (
          <Help key={p.name} id={`preset.${p.name}`} as="div">
            <button
              type="button"
              aria-pressed={a.name === p.name}
              className={`preset-option ${a.name === p.name ? "active" : ""}`}
              onClick={() => {
                s.newModel(p);
                setSelected(p.layers[0].id);
                setFeedback(`${p.name} ready to edit. Changes saved.`);
              }}
            >
              <span className="preset-bars">
                {Array.from({ length: i + 2 }, (_, j) => (
                  <i key={j} style={{ height: 12 + j * 5 }} />
                ))}
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {i === 0
                    ? "Small & nimble"
                    : i === 1
                      ? "Room to learn"
                      : i === 2
                        ? "Deeper features"
                        : "More capacity"}
                </small>
              </span>
              {a.name === p.name && <Check size={15} />}
            </button>
          </Help>
        ))}
      </div>
      <SectionHeading
        title="Your architecture"
        description="Select a block, then edit its properties below. Scroll or drag the canvas to explore the network."
        action={
          <Help id="architecture">
            <span className="small-label">
              {a.layers.length} LAYERS <Explain id="architecture" />
            </span>
          </Help>
        }
      />
      <Help id="architecture" as="div" className="architecture-selector">
        <label htmlFor="selected-layer">Inspect a layer</label>
        <select
          id="selected-layer"
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
          }}
        >
          <option value="">Choose a block</option>
          {a.layers.map((l, i) => (
            <option key={l.id} value={l.id}>
              {i + 1}. {LAYER_NAMES[l.kind]}
              {l.kind === "conv"
                ? ` · ${l.width} filters`
                : l.kind === "dense"
                  ? ` · ${l.width} outputs`
                  : ""}
            </option>
          ))}
        </select>
      </Help>
      <div className="architecture-canvas">
        <ReactFlow
          onInit={setFlow}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, n) => {
            if (n.id !== "input") setSelected(n.id);
          }}
          defaultViewport={{ x: 12, y: 0, zoom: 0.85 }}
          minZoom={0.25}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          nodesFocusable={true}
          panOnScroll
          zoomOnScroll={false}
          preventScrolling={false}
        >
          <Background gap={20} size={1} color="#dce5e9" />
        </ReactFlow>
        <div className="canvas-caption">
          <span className="live-dot" /> {s.dataset.resolution} ×{" "}
          {s.dataset.resolution} RGB → cat / dog
        </div>
      </div>
      <p className="architecture-feedback" role="status">
        {locked
          ? s.running
            ? "Choose a starting point above to make a new model, or stop training to edit this one."
            : "This model has been evaluated. Choose a starting point above to make a new one."
          : feedback ||
            "Layer changes save automatically. Use the info buttons for explanations."}
      </p>
      <div className="model-properties">
        <section className="panel">
          <SectionHeading
            title={
              l
                ? `Layer ${selectedIndex + 1} · ${LAYER_NAMES[l.kind]}`
                : "Layer properties"
            }
            action={l && <Explain id={`layer.${l.kind}`} />}
          />
          {l ? (
            <>
              <div className="field-grid">
                <Field label="Layer type" help={`layer.${l.kind}`}>
                  <select
                    aria-label="Selected layer type"
                    value={l.kind}
                    disabled={locked}
                    onChange={(e) => {
                      const kind = e.target.value as LayerKind;
                      update(layer(kind, kind === "dense" ? 2 : 64, l.id));
                    }}
                  >
                    {Object.entries(LAYER_NAMES).map(([kind, name]) => (
                      <option key={kind} value={kind}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                {["conv", "dense"].includes(l.kind) && (
                  <Field
                    label={l.kind === "conv" ? "Filters" : "Outputs"}
                    help="filters"
                  >
                    <Select
                      help="filters"
                      value={l.width}
                      options={
                        l.kind === "dense"
                          ? [2, 16, 32, 64, 128, 256]
                          : [8, 16, 32, 64, 128, 256, 512]
                      }
                      disabled={locked}
                      onChange={(v) => update({ width: +v })}
                    />
                  </Field>
                )}
                {l.kind === "conv" && (
                  <>
                    <Field label="Kernel size" help="kernel">
                      <Select
                        help="kernel"
                        value={l.kernel}
                        options={[1, 3, 5, 7]}
                        disabled={locked}
                        onChange={(v) => update({ kernel: +v })}
                      />
                    </Field>
                    <Field label="Stride" help="stride">
                      <Select
                        help="stride"
                        value={l.stride}
                        options={[1, 2]}
                        disabled={locked}
                        onChange={(v) => update({ stride: +v })}
                      />
                    </Field>
                    <Field label="Padding" help="padding">
                      <Select
                        help="padding"
                        value={l.padding}
                        options={["Same", "Valid"]}
                        disabled={locked}
                        onChange={(v) => update({ padding: v })}
                      />
                    </Field>
                  </>
                )}
                {l.kind === "relu" && (
                  <Field label="Activation" help="activation">
                    <Select
                      help="activation"
                      value={l.activation}
                      options={["ReLU", "GELU", "Sigmoid"]}
                      disabled={locked}
                      onChange={(v) => update({ activation: v })}
                    />
                  </Field>
                )}
                {l.kind === "dropout" && (
                  <Field label="Dropout rate" help="dropout">
                    <div className="range-value">
                      <input
                        type="range"
                        min="0"
                        max=".8"
                        step=".05"
                        value={s.training.dropout}
                        disabled={locked}
                        onChange={(e) =>
                          s.updateTraining({ dropout: +e.target.value })
                        }
                        aria-label="Architecture dropout rate"
                      />
                      <strong>{s.training.dropout.toFixed(2)}</strong>
                    </div>
                  </Field>
                )}
              </div>
              <div className="layer-actions">
                <Button
                  help="layer.move"
                  variant="secondary"
                  disabled={locked || a.layers.indexOf(l) === 0}
                  onClick={() => move(-1)}
                >
                  <ArrowUp size={14} />
                  Earlier
                </Button>
                <Button
                  help="layer.move"
                  variant="secondary"
                  disabled={
                    locked || a.layers.indexOf(l) === a.layers.length - 1
                  }
                  onClick={() => move(1)}
                >
                  <ArrowDown size={14} />
                  Later
                </Button>
                <Button
                  help="layer.remove"
                  variant="quiet"
                  disabled={locked}
                  onClick={() => {
                    const remaining = a.layers.filter((x) => x.id !== l.id);
                    s.setArchitecture({
                      name: "Custom CNN",
                      layers: remaining,
                    });
                    setSelected(
                      remaining[Math.min(selectedIndex, remaining.length - 1)]
                        ?.id ?? "",
                    );
                    setFeedback(
                      `Removed ${LAYER_NAMES[l.kind]}. Changes saved.`,
                    );
                  }}
                >
                  <Trash2 size={14} />
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <p className="muted">
              Select a block in the network to configure it.
            </p>
          )}
        </section>
        <section className="panel">
          <SectionHeading
            title="Make room for an idea"
            description="Insert a layer before the output, then reorder it in the properties panel."
          />
          <Field label="Layer type" help={`layer.${addKind}`}>
            <Help id={`layer.${addKind}`}>
              <select
                value={addKind}
                disabled={locked}
                onChange={(e) => setAddKind(e.target.value as LayerKind)}
                aria-label="New layer type"
              >
                {Object.entries(LAYER_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </Help>
          </Field>
          <Button
            help="layer.add"
            variant="secondary"
            disabled={locked}
            onClick={() => {
              const item = layer(addKind, addKind === "dense" ? 2 : 64);
              s.setArchitecture({
                name: "Custom CNN",
                layers: [...a.layers.slice(0, -1), item, ...a.layers.slice(-1)],
              });
              setSelected(item.id);
              setFeedback(
                `Added ${LAYER_NAMES[item.kind]} at layer ${Math.max(1, a.layers.length)}. Changes saved.`,
              );
            }}
          >
            <Plus size={15} />
            Add layer
          </Button>
        </section>
      </div>
      {errors.length > 0 && (
        <div className="inline-notice warning">{errors.join(" ")}</div>
      )}
      <SectionHeading
        title="The footprint of your idea"
        description="Estimates update with architecture, input resolution, batch size and hardware."
      />
      <div className="estimator-row">
        {[
          {
            help: "parameters",
            label: "Parameters",
            value: `${(est.parameters / 1e6).toFixed(2)}M`,
          },
          {
            help: "vram",
            label: "Estimated VRAM",
            value: `${est.vram.toFixed(1)} GB`,
          },
          {
            help: "size",
            label: "Model size",
            value: `${est.size.toFixed(1)} MB`,
          },
          { help: "cost", label: "Training cost", value: money(est.cost) },
          {
            help: "latency",
            label: "Inference",
            value: `${est.latency.toFixed(1)} ms`,
          },
        ].map((x) => (
          <Help id={x.help} key={x.help} as="div">
            <span>
              {x.label}
              <Explain id={x.help} />
            </span>
            <strong>{x.value}</strong>
          </Help>
        ))}
      </div>
      <div className="stage-footer">
        <span>
          {errors.length
            ? "Resolve architecture issues before training."
            : "Architecture ready. Your learning strategy is next."}
        </span>
        <Button help="nav.training" onClick={() => s.setStage("training")}>
          Configure training
          <ArrowRight size={15} />
        </Button>
      </div>
    </>
  );
}
