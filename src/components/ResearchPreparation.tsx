import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Layers3,
  Pause,
  Play,
  SkipForward,
  Square,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FILTERS,
  MODEL_PRESETS,
  SOURCES,
  billions,
  params,
} from "../game/researchCatalog";
import {
  baseScores,
  modelSize,
  projectLLM,
  simulateLLM,
  sourceCost,
  sourceScale,
} from "../game/llmSimulation";
import type { ResearchProject, TokenMetric } from "../types/research";
import { useResearch } from "../store/researchStore";
import { money } from "../game/catalog";
import { Button, StageHeading } from "./ui";
import { Explain, Help, useInspector } from "./Help";
import { ConfigFields, Facts, Issues, ResearchSection } from "./ResearchFields";

export function CorpusPage({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    c = p.config,
    e = projectLLM(c, p.contract),
    locked = !!p.running || p.deployed;
  const total = Object.values(c.data.mixture).reduce((a, b) => a + b, 0);
  const [sample, setSample] = useState(
    "The quick brown fox writes Python. 你好，世界。",
  );
  const setMixture = (mixture: Record<string, number>) =>
    s.configure("data", { mixture });
  const normalize = () => {
    const entries = SOURCES.filter(
      (source) => (c.data.mixture[source.id] ?? 0) > 0,
    ).map((source) => ({ id: source.id, weight: c.data.mixture[source.id] }));
    const sum = entries.reduce((a, b) => a + b.weight, 0);
    if (!sum) return;
    let used = 0;
    const mixture: Record<string, number> = {};
    entries.forEach((x, j) => {
      const n =
        j === entries.length - 1
          ? 100 - used
          : Math.floor((x.weight / sum) * 100);
      mixture[x.id] = n;
      used += n;
    });
    setMixture(mixture);
  };
  const alternative = structuredClone(c);
  alternative.tokenizer.vocab = c.tokenizer.vocab === 128000 ? 32000 : 128000;
  const alt = projectLLM(alternative, p.contract);
  const pieces = sample.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
  const tokens = pieces.flatMap((word) =>
    word.length > (c.tokenizer.vocab >= 64000 ? 10 : 5)
      ? [word.slice(0, 3), `##${word.slice(3)}`]
      : [word],
  );
  return (
    <>
      <StageHeading
        title="Good models start with their corpus."
        description="Acquire text, make its tradeoffs visible, then turn it into training sequences."
      />
      <ResearchSection
        stage="acquire"
        description="Licenses grant a fixed source pool for this contract. All volumes and prices are simulated."
        action={
          <Button
            help="llm.source.web"
            disabled={
              locked ||
              SOURCES.filter((x) => (c.data.mixture[x.id] ?? 0) > 0).every(
                (x) => c.data.acquired.includes(x.id),
              )
            }
            onClick={s.starterCorpus}
          >
            Acquire current mixture
            <Database size={15} />
          </Button>
        }
      >
        <div className="research-table-wrap">
          <table className="research-table corpus-table">
            <thead>
              <tr>
                <th>Source & character</th>
                <th>Source pool</th>
                <th>License</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((source) => (
                <tr key={source.id}>
                  <td>
                    <strong>
                      {source.name}
                      <Explain id={`llm.source.${source.id}`} />
                    </strong>
                    <small>{source.specialty}</small>
                  </td>
                  <td>
                    {billions(source.words * sourceScale(p.contract))} words
                  </td>
                  <td>{money(sourceCost(p.contract, source.cost))}</td>
                  <td>
                    <Button
                      help={`llm.source.${source.id}`}
                      variant="secondary"
                      disabled={
                        locked ||
                        c.data.acquired.includes(source.id) ||
                        sourceCost(p.contract, source.cost) > p.budget
                      }
                      onClick={() => s.acquire(source.id)}
                    >
                      {c.data.acquired.includes(source.id) ? (
                        <>
                          <Check size={13} />
                          Acquired
                        </>
                      ) : (
                        "Acquire"
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResearchSection>
      <ResearchSection
        stage="clean"
        description="Every filter trades corpus volume for a different kind of quality. Compare retention, quality, and breadth before training."
      >
        <ConfigFields project={p} group="data" names={["intensity"]} />
        <div className="research-check-list">
          {FILTERS.map((filter) => (
            <Help key={filter.id} id={`llm.filter.${filter.id}`} as="div">
              <label>
                <input
                  type="checkbox"
                  checked={c.data.filters.includes(filter.id)}
                  disabled={locked}
                  onChange={() =>
                    s.configure("data", {
                      filters: c.data.filters.includes(filter.id)
                        ? c.data.filters.filter((id) => id !== filter.id)
                        : [...c.data.filters, filter.id],
                    })
                  }
                />
                <span>
                  <strong>{filter.name}</strong>
                  <small>{filter.description}</small>
                </span>
                <Explain id={`llm.filter.${filter.id}`} />
              </label>
            </Help>
          ))}
        </div>
        <Facts
          items={[
            {
              label: "Acquired source text",
              value: billions(e.rawWords),
              note: "words, before mixture sampling",
            },
            {
              label: "Filter retention",
              value: `${(e.retained * 100).toFixed(1)}%`,
              note: `Quality index ${(e.quality * 100).toFixed(0)}/100`,
            },
            {
              label: "Knowledge breadth",
              value: `${(e.breadth * 100).toFixed(0)}%`,
              note: "relative to unfiltered source mix",
            },
          ]}
        />
        <div className="contamination-notice">
          <ScanIcon />
          <div>
            <h3>
              {c.data.filters.includes("benchmark")
                ? "Potential benchmark overlap detected"
                : "Overlap scan is disabled"}
            </h3>
            <p>
              Illustrative scan: 3.1% of public benchmark examples overlap the
              raw corpus. Keeping them raises public scores; it does not improve
              fresh-task performance.
            </p>
          </div>
        </div>
        <ConfigFields project={p} group="data" names={["decontaminate"]} />
      </ResearchSection>
      <ResearchSection
        stage="mixture"
        description="Percentages are sampling weights. The smallest source relative to its weight limits your unique mixed corpus."
      >
        <div className="research-actions">
          <Button
            help="llm.benchmarks"
            variant="secondary"
            disabled={locked}
            onClick={() =>
              setMixture({
                web: 50,
                books: 15,
                wiki: 10,
                code: 10,
                papers: 5,
                math: 5,
                multilingual: 5,
              })
            }
          >
            General knowledge
          </Button>
          <Button
            help="llm.benchmarks"
            variant="secondary"
            disabled={locked}
            onClick={() =>
              setMixture({
                web: 20,
                code: 45,
                qa: 10,
                math: 15,
                wiki: 5,
                books: 5,
              })
            }
          >
            Code & reasoning
          </Button>
          <Button
            help="llm.benchmarks"
            variant="secondary"
            disabled={locked}
            onClick={() =>
              setMixture({
                web: 30,
                multilingual: 40,
                books: 10,
                wiki: 10,
                dialogue: 10,
              })
            }
          >
            Multilingual
          </Button>
        </div>
        <div className="mixture-controls">
          {SOURCES.map((source) => (
            <div key={source.id}>
              <label htmlFor={`mix-${source.id}`}>
                {source.name}
                {!c.data.acquired.includes(source.id) &&
                  (c.data.mixture[source.id] ?? 0) > 0 && (
                    <small>Acquire first</small>
                  )}
              </label>
              <input
                id={`mix-${source.id}`}
                type="range"
                min="0"
                max="100"
                step="1"
                disabled={locked}
                value={c.data.mixture[source.id] ?? 0}
                onChange={(event) =>
                  setMixture({
                    ...c.data.mixture,
                    [source.id]: Number(event.target.value),
                  })
                }
              />
              <output>{c.data.mixture[source.id] ?? 0}%</output>
            </div>
          ))}
        </div>
        <div
          className={`mixture-total ${total === 100 ? "valid" : "invalid"}`}
          role="status"
        >
          <strong>{total}% / 100%</strong>
          <Button
            help="llm.lifecycle"
            variant="quiet"
            disabled={locked || !total || total === 100}
            onClick={normalize}
          >
            Normalize to 100%
          </Button>
        </div>
        <p className="research-note">
          Compare the free capability forecast: more code raises programming
          potential while drawing capacity away from writing and language
          coverage.
        </p>
        <CapabilityPreview project={p} />
      </ResearchSection>
      <ResearchSection
        stage="tokenizer"
        description="Explore vocabulary efficiency and embedding cost. No actual tokenizer is trained in this browser."
      >
        <ConfigFields project={p} group="tokenizer" />
        <div className="tokenizer-comparison">
          <div>
            <strong>
              {(c.tokenizer.vocab / 1000).toFixed(0)}K vocabulary · current
            </strong>
            <span>{e.fertility.toFixed(2)} tokens / word</span>
            <b>{params(e.embedding)} embedding parameters</b>
          </div>
          <ArrowRight size={18} />
          <div>
            <strong>
              {(alternative.tokenizer.vocab / 1000).toFixed(0)}K vocabulary ·
              comparison
            </strong>
            <span>{alt.fertility.toFixed(2)} tokens / word</span>
            <b>{params(alt.embedding)} embedding parameters</b>
          </div>
        </div>
        <label className="token-demo-label" htmlFor="token-demo">
          Try a sentence{" "}
          <small>
            Illustrative subword boundaries, not the selected algorithm’s actual
            output
          </small>
        </label>
        <textarea
          id="token-demo"
          value={sample}
          maxLength={300}
          onChange={(event) => setSample(event.target.value)}
        />
        <div className="token-pieces">
          {c.tokenizer.bos && <span className="special">&lt;bos&gt;</span>}
          {tokens.map((token, i) => (
            <span key={i}>{token}</span>
          ))}
          {c.tokenizer.eos && <span className="special">&lt;eos&gt;</span>}
        </div>
        <Facts
          items={[
            {
              label: "Eligible mixed tokens",
              value: billions(e.tokens),
              note: "after filters, sampling & tokenization",
            },
            {
              label: "Alternative vocabulary",
              value: billions(alt.tokens),
              note: `same text, ${alternative.tokenizer.vocab / 1000}K vocabulary`,
            },
            {
              label: "Planned compute",
              value: money(e.cost),
              note: `Alternative vocabulary: ${money(alt.cost)}`,
            },
          ]}
        />
      </ResearchSection>
      <ResearchSection
        stage="sequence"
        description="Construct causal sequences and choose what happens at document boundaries."
      >
        <ConfigFields project={p} group="sequence" />
        <div className="sequence-example">
          <strong>
            {c.sequence.packing ? "Packed sequence" : "Padded sequence"} ·{" "}
            {c.sequence.context.toLocaleString()} tokens
          </strong>
          <div>
            <span>Document A</span>
            {c.sequence.boundaries && <b>EOS</b>}
            {c.sequence.packing ? (
              <>
                <span>Document B</span>
                {c.sequence.boundaries && <b>EOS</b>}
                <span>Document C</span>
              </>
            ) : (
              <i>padding · unused token positions</i>
            )}
          </div>
        </div>
        <Button help="llm.lifecycle" onClick={() => s.page("architecture")}>
          Design your Transformer
          <ArrowRight size={15} />
        </Button>
      </ResearchSection>
    </>
  );
}
function ScanIcon() {
  return <Activity size={20} />;
}
function CapabilityPreview({ project: p }: { project: ResearchProject }) {
  const e = projectLLM(p.config, p.contract),
    scores = baseScores(p.config, e);
  return (
    <div
      className="capability-preview"
      aria-label="Simulated capability potential"
    >
      {(
        [
          ["knowledge", "Knowledge"],
          ["code", "Code"],
          ["reasoning", "Reasoning"],
          ["writing", "Writing"],
          ["multilingual", "Languages"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <span>{label}</span>
          <b>{scores[key].toFixed(1)}%</b>
        </div>
      ))}
    </div>
  );
}
export function ArchitecturePage({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    c = p.config,
    a = c.architecture,
    e = projectLLM(c, p.contract),
    inspector = useInspector();
  const [block, setBlock] = useState("Attention");
  const blocks = [
    "RMSNorm / LayerNorm",
    "Attention",
    "Residual",
    "MLP",
    "Final normalization",
    "LM head",
  ];
  return (
    <>
      <StageHeading
        title="Design the engine of your model."
        description="A decoder-only Transformer. Scale its capacity, then make its attention fit your use case."
      />
      <ResearchSection
        stage="architecture"
        description="Presets set dimensions; every dimension remains yours to edit."
      >
        <div
          className="model-preset-row"
          role="group"
          aria-label="Transformer size presets"
        >
          {MODEL_PRESETS.map((preset) => (
            <button
              key={preset.name}
              aria-pressed={a.preset === preset.name}
              disabled={!!p.running || p.deployed}
              onClick={() => s.preset(preset.name)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="transformer-diagram">
          <div>
            <Database size={20} />
            <strong>Token embedding</strong>
            <small>
              {c.tokenizer.vocab.toLocaleString()} × {a.hidden.toLocaleString()}
            </small>
          </div>
          <ArrowRight size={17} />
          <button
            className="transformer-block"
            onClick={() =>
              setBlock(block === "Attention" ? "MLP" : "Attention")
            }
          >
            <Layers3 size={21} />
            <strong>Transformer × {a.layers}</strong>
            <small>
              {a.norm} → {a.attention} → residual → {a.norm} → {a.activation}{" "}
              MLP → residual
            </small>
          </button>
          <ArrowRight size={17} />
          <div>
            <Activity size={20} />
            <strong>Final norm → LM head</strong>
            <small>Next-token distribution</small>
          </div>
        </div>
        <div className="transformer-tabs">
          {blocks.map((name) => (
            <button
              key={name}
              aria-pressed={block === name}
              onClick={() => {
                setBlock(name);
                inspector.pin(
                  name === "Attention"
                    ? "llm.architecture.attention"
                    : name === "MLP"
                      ? "llm.architecture.activation"
                      : name === "LM head"
                        ? "llm.tokenizer.vocab"
                        : "llm.architecture.norm",
                );
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="research-note">
          {block === "Attention"
            ? `${a.heads} query heads attend to preceding tokens; ${e.kvHeads} key/value heads are stored per layer. Head dimension: ${(a.hidden / a.heads).toFixed(0)}.`
            : block === "MLP"
              ? `Each ${a.activation} feed-forward network expands ${a.hidden.toLocaleString()} features to ${a.mlp.toLocaleString()} before projecting back into the residual stream.`
              : block === "Residual"
                ? "Residual connections add each sublayer’s output back to its input, providing a direct path for information and gradients."
                : block === "LM head"
                  ? `The LM head maps ${a.hidden.toLocaleString()} hidden features into logits over ${c.tokenizer.vocab.toLocaleString()} tokens. Softmax produces the next-token distribution.`
                  : `${a.norm} rescales representations to stabilize the stream before attention and feed-forward computation.`}
        </p>
        <ConfigFields
          project={p}
          group="architecture"
          names={[
            "layers",
            "hidden",
            "heads",
            "mlp",
            "attention",
            ...(a.attention === "GQA" ? ["kvHeads"] : []),
            "activation",
            "norm",
            "position",
            "window",
            "tied",
            "moe",
          ]}
        />
        {a.moe && (
          <>
            <h3 className="research-subheading">Expert routing</h3>
            <ConfigFields
              project={p}
              group="architecture"
              names={["experts", "active", "capacity", "balance"]}
            />
            <p className="research-note">
              All {a.experts} experts occupy memory. Only {a.active} experts
              process each token; communication and load balancing become part
              of your training strategy.
            </p>
          </>
        )}
        <Facts
          items={[
            {
              label: "Total parameters",
              value: params(e.parameters),
              note: "all stored weights",
            },
            {
              label: "Active / token",
              value: params(e.activeParameters),
              note: a.moe
                ? `${a.active} of ${a.experts} experts`
                : "dense Transformer",
            },
            {
              label: "Embedding & output",
              value: params(e.embedding),
              note: c.architecture.tied
                ? "tied input/output table"
                : "separate input/output tables",
            },
          ]}
        />
        <Issues
          issues={e.issues.filter(
            (x) =>
              x.includes("head") ||
              x.includes("expert") ||
              x.includes("Hidden"),
          )}
          warnings={e.warnings.filter((x) => x.includes("expert"))}
        />
        <Button help="llm.lifecycle" onClick={() => s.page("compute")}>
          Configure the training cluster
          <ArrowRight size={15} />
        </Button>
      </ResearchSection>
    </>
  );
}
export function TokenChart({
  metrics,
  kind = "loss",
  height = 220,
}: {
  metrics: TokenMetric[];
  kind?: "loss" | "lr";
  height?: number;
}) {
  return (
    <div
      className="token-chart"
      role="img"
      aria-label={
        kind === "lr"
          ? "Learning rate by training tokens"
          : "Training and validation loss by billions of tokens"
      }
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={metrics}
          margin={{ top: 15, right: 12, bottom: 4, left: -12 }}
        >
          <CartesianGrid
            stroke="#e5eaed"
            vertical={false}
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="tokens"
            tickFormatter={(n) => `${Number(n).toFixed(1)}B`}
            tick={{ fontSize: 11, fill: "#647583" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#647583" }}
            axisLine={false}
            tickLine={false}
            domain={kind === "lr" ? [0, "auto"] : [0, "auto"]}
            tickFormatter={(n) =>
              kind === "lr" ? Number(n).toExponential(0) : Number(n).toFixed(1)
            }
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => `${Number(v).toFixed(2)}B tokens`}
            formatter={(v: any) =>
              kind === "lr" ? Number(v).toExponential(2) : Number(v).toFixed(3)
            }
          />
          <Line
            dataKey={kind === "lr" ? "lr" : "trainLoss"}
            name={kind === "lr" ? "Learning rate" : "Train loss"}
            stroke="#7c85c2"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          {kind === "loss" && (
            <Line
              dataKey="valLoss"
              name="Validation loss"
              stroke="#218777"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
export function ComputePage({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    e = projectLLM(p.config, p.contract),
    r = p.running,
    latest = r ?? p.runs.at(-1),
    metric = latest?.metrics[Math.max(0, latest.cursor - 1)],
    cp = p.checkpoints.at(-1);
  const [chart, setChart] = useState<"loss" | "lr">("loss");
  const forecast = useMemo(
    () => simulateLLM(p.config, p.contract, 0),
    [p.config, p.contract],
  );
  const metrics = latest
    ? latest.metrics.slice(0, latest.cursor)
    : forecast.metrics;
  const pending = r?.event && !r.eventResolved && r.cursor >= r.event.at;
  return (
    <>
      <StageHeading
        title="Train in tokens. Think in tradeoffs."
        description="Provision the cluster, balance model and data, and follow next-token learning."
      />
      <ResearchSection
        stage="infrastructure"
        description="Fit model states and activations on every GPU; aggregate memory alone is not enough."
      >
        <ConfigFields
          project={p}
          group="infrastructure"
          names={[
            "gpu",
            "nodes",
            "perNode",
            "network",
            "interconnect",
            "strategy",
            "tensor",
            "pipeline",
            "sequenceParallel",
            "expertParallel",
            "precision",
            "checkpointing",
          ]}
        />
        <Facts
          items={[
            {
              label: "Cluster",
              value: `${e.gpus} GPUs`,
              note: `${p.config.infrastructure.nodes} nodes × ${p.config.infrastructure.perNode}`,
            },
            {
              label: "Memory / GPU",
              value: `${e.memory.toFixed(1)} GB`,
              note: `${e.capacity} GB physical capacity`,
            },
            {
              label: "Utilization estimate",
              value: `${e.utilization.toFixed(1)}%`,
              note: `Comms ${e.communication.toFixed(1)}% · loader ${e.stalls.toFixed(1)}%`,
            },
          ]}
        />
        <h3 className="research-subheading">
          A batch is more than a microbatch
        </h3>
        <ConfigFields
          project={p}
          group="infrastructure"
          names={["microbatch", "accumulation"]}
        />
        <div className="batch-equation">
          <span>
            {p.config.infrastructure.microbatch}
            <small>microbatch</small>
          </span>
          <b>×</b>
          <span>
            {p.config.infrastructure.accumulation}
            <small>accumulation</small>
          </span>
          <b>×</b>
          <span>
            {e.dp}
            <small>data-parallel replicas</small>
          </span>
          <b>=</b>
          <span>
            {e.effectiveBatch.toLocaleString()}
            <small>sequences / update</small>
          </span>
        </div>
      </ResearchSection>
      <ResearchSection
        stage="configuration"
        description="Cross-entropy next-token prediction is the objective. Validation loss and perplexity replace classification accuracy."
      >
        <div className="next-token-example">
          <div>
            <span>Input</span>
            <b>The</b>
            <b>quick</b>
            <b>brown</b>
          </div>
          <div>
            <span>Target</span>
            <b>quick</b>
            <b>brown</b>
            <b>fox</b>
          </div>
          <p>
            Each input token predicts the next token using earlier context.
            Example losses 0.12, 0.31, 1.42 are illustrative.
            <Explain id="llm.pretraining" />
          </p>
        </div>
        <ConfigFields project={p} group="training" />
        <Facts
          items={[
            {
              label: "Tokens / active parameter",
              value: (p.config.training.tokens / e.activeParameters).toFixed(1),
              note: `Teaching reference: ${billions(e.activeParameters * 20)}–${billions(e.activeParameters * 30)}`,
            },
            {
              label: "Total updates",
              value: e.steps.toLocaleString(),
              note: `${Math.round(e.batchTokens).toLocaleString()} tokens/update`,
            },
            {
              label: "Training FLOPs",
              value: e.flops.toExponential(2),
              note: `${e.hours.toFixed(1)} simulated GPU-cluster hours`,
            },
          ]}
        />
      </ResearchSection>
      <ResearchSection
        stage="pretraining"
        description="Playback compresses the run into 40 observations. Loss, token counts, and costs come from the saved configuration."
      >
        <div className="training-run-header">
          <div>
            <h3>
              {r
                ? `Pretraining #${r.id} · ${r.paused ? "paused" : "running"}`
                : latest
                  ? `Pretraining #${latest.id} · ${latest.status}`
                  : "Free training forecast"}
            </h3>
            <p>
              {latest
                ? `${billions(metric?.tokens ?? 0)} tokens processed`
                : "Inspect the curve before committing your budget."}
            </p>
          </div>
          <div className="research-actions">
            {r ? (
              <>
                <Button
                  help="llm.pretraining"
                  variant="secondary"
                  disabled={!!pending}
                  onClick={s.pause}
                >
                  {r.paused ? <Play size={15} /> : <Pause size={15} />}{" "}
                  {r.paused ? "Resume" : "Pause"}
                </Button>
                <Button
                  help="llm.pretraining"
                  variant="secondary"
                  disabled={!r.paused || !!pending}
                  onClick={() => s.tick(true)}
                >
                  <SkipForward size={15} />
                  Step
                </Button>
                <Button
                  help="llm.pretraining"
                  variant="secondary"
                  onClick={s.stop}
                >
                  <Square size={14} />
                  Stop & refund
                </Button>
              </>
            ) : (
              <Button
                help="llm.pretraining"
                disabled={
                  p.deployed || e.issues.length > 0 || e.cost > p.budget
                }
                onClick={s.start}
              >
                <Play size={15} />
                Start pretraining · {money(e.cost)}
              </Button>
            )}
          </div>
        </div>
        <div
          className="training-progress"
          role="progressbar"
          aria-label="Pretraining token progress"
          aria-valuemin={0}
          aria-valuemax={40}
          aria-valuenow={latest?.cursor ?? 0}
        >
          <i style={{ transform: `scaleX(${(latest?.cursor ?? 0) / 40})` }} />
        </div>
        <div className="chart-choice">
          <button
            aria-pressed={chart === "loss"}
            onClick={() => setChart("loss")}
          >
            Loss & perplexity
          </button>
          <button aria-pressed={chart === "lr"} onClick={() => setChart("lr")}>
            Learning rate
          </button>
          <label>
            Playback
            <select
              aria-label="LLM playback speed"
              value={s.speed}
              onChange={(event) => s.setSpeed(Number(event.target.value))}
            >
              {[1, 2, 4, 8].map((speed) => (
                <option key={speed} value={speed}>
                  {speed}×
                </option>
              ))}
            </select>
          </label>
        </div>
        <TokenChart metrics={metrics} kind={chart} />
        <Facts
          items={[
            {
              label: "Validation loss",
              value: metric?.valLoss.toFixed(3) ?? "—",
              note: latest
                ? `Training loss ${metric?.trainLoss.toFixed(3) ?? "—"}`
                : "No compute spent yet",
            },
            {
              label: "Perplexity",
              value: metric?.perplexity.toFixed(2) ?? "—",
              note: "exp(validation cross-entropy)",
            },
            {
              label: "Token throughput",
              value: `${((metric?.throughput ?? e.throughput) / 1000).toFixed(1)}K/s`,
              note: `Step ${metric?.step.toLocaleString() ?? 0} / ${(latest?.estimate.steps ?? e.steps).toLocaleString()}`,
            },
          ]}
        />
        {pending && (
          <div className="training-incident" role="alert">
            <h3>
              <Activity size={19} />
              {r.event!.title}
            </h3>
            <p>{r.event!.description}</p>
            <p>
              Unsaved progress: {billions(r.event!.lostTokens)} tokens ·{" "}
              {money(r.event!.lostCost)} to repeat. Gradient norm:{" "}
              {metric?.gradNorm.toFixed(1)}.
            </p>
            <div className="research-actions">
              <Button
                help="llm.checkpoints"
                onClick={() => s.recover("rollback")}
              >
                Restore checkpoint & reduce LR
              </Button>
              {r.event!.type !== "failure" && (
                <>
                  <Button
                    help="llm.checkpoints"
                    variant="secondary"
                    onClick={() => s.recover("clip")}
                  >
                    Restore & enable clipping
                  </Button>
                  <Button
                    help="llm.pretraining"
                    variant="secondary"
                    onClick={() => s.recover("continue")}
                  >
                    Continue with risk
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        {!r && cp && (
          <div className="research-actions">
            <Button
              help="llm.checkpoints"
              onClick={() => {
                s.selectCheckpoint(cp.id);
                s.page("evaluation");
              }}
            >
              Select latest checkpoint & evaluate
              <ArrowRight size={15} />
            </Button>
            <span>{p.checkpoints.length} snapshots preserved</span>
          </div>
        )}
        <Issues
          issues={
            r
              ? []
              : [
                  ...e.issues,
                  ...(e.cost > p.budget
                    ? ["Run cost exceeds the remaining research budget."]
                    : []),
                ]
          }
          warnings={e.warnings}
        />
      </ResearchSection>
    </>
  );
}
export function LLMTrainingDock({ project: p }: { project: ResearchProject }) {
  const [expanded, setExpanded] = useState(false),
    [forecast, setForecast] = useState(false),
    [seek, setSeek] = useState<number | null>(null);
  const s = useResearch(),
    preview = useMemo(
      () => simulateLLM(p.config, p.contract, 0),
      [p.config, p.contract],
    );
  const run = forecast ? preview : (p.running ?? p.runs.at(-1) ?? preview);
  const isPreview = run.id === 0,
    e = run.estimate,
    config = run.config,
    available = isPreview ? 40 : run.cursor,
    index = Math.min(available, seek ?? available);
  const m = index > 0 ? run.metrics[index - 1] : null;
  return (
    <section
      className={`llm-dock ${expanded ? "expanded" : ""}`}
      aria-label="LLM training observatory"
    >
      <div className="llm-dock-bar">
        <strong>
          <Activity size={17} />
          Learning, in tokens
        </strong>
        <span>
          {p.running ? (
            <>
              <i className="live-dot" />
              Training ·{" "}
              {billions(
                (p.running.config.training.tokens * p.running.cursor) / 40,
              )}
            </>
          ) : (
            `${params(e.parameters)} · ${billions(isPreview ? config.training.tokens : (run.metrics[Math.max(0, available - 1)]?.tokens ?? 0))} ${isPreview ? "planned" : "seen"}`
          )}
        </span>
        <span>
          {isPreview ? "Forecast loss" : "Saved loss"}{" "}
          <b>{m?.valLoss.toFixed(3) ?? "—"}</b>
        </span>
        <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          Explore
        </button>
      </div>
      {expanded && (
        <div className="llm-dock-content">
          <div>
            <div className="chart-choice">
              <label>
                <input
                  type="checkbox"
                  checked={forecast}
                  onChange={(event) => {
                    setForecast(event.target.checked);
                    setSeek(null);
                  }}
                />
                Draft forecast
              </label>
              <span>
                {isPreview ? "Free simulated forecast" : `Saved run #${run.id}`}
              </span>
            </div>
            <TokenChart
              metrics={run.metrics.slice(0, isPreview ? 40 : available)}
              height={150}
            />
            <label className="dock-scrubber">
              Inspect token progress
              <input
                aria-label="Inspect LLM training observation"
                type="range"
                min={1}
                max={Math.max(1, available)}
                value={Math.max(1, index)}
                disabled={!available}
                onChange={(event) => setSeek(Number(event.target.value))}
              />
              {index}/{available}
            </label>
          </div>
          <div className="dock-explanation">
            <h3>
              Next-token learning <Explain id="llm.pretraining" />
            </h3>
            <p>
              {m
                ? `After ${billions(m.tokens)} tokens, validation perplexity is ${m.perplexity.toFixed(2)}. The current learning rate is ${m.lr.toExponential(2)}.`
                : "Start a run to see saved token observations."}
            </p>
            <p>
              {e.activeParameters < e.parameters
                ? `${params(e.parameters)} total parameters, ${params(e.activeParameters)} active per token.`
                : `${config.architecture.layers} Transformer layers · ${config.architecture.attention} · ${config.sequence.context.toLocaleString()} training context.`}
            </p>
            <small>
              {isPreview
                ? "A forecast spends no research budget."
                : "Saved observations use the run’s immutable configuration."}{" "}
              All values are simulated.
            </small>
          </div>
        </div>
      )}
    </section>
  );
}
