import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  GitBranch,
  MessageSquare,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  CAPABILITY_LABELS,
  SAFETY_CATEGORIES,
  TOOL_OPTIONS,
  billions,
  contractFor,
  params,
} from "../game/researchCatalog";
import {
  attackSuccess,
  clamp,
  estimateServing,
  rewardAccuracy,
} from "../game/llmSimulation";
import { useResearch, selectedModel } from "../store/researchStore";
import type { Capability, ResearchProject } from "../types/research";
import { money } from "../game/catalog";
import { Button, StageHeading } from "./ui";
import { Explain } from "./Help";
import {
  ConfigFields,
  Facts,
  Issues,
  ResearchSection,
  TreatmentButton,
} from "./ResearchFields";

function SelectedModel({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    cp = selectedModel(p);
  return (
    <div className={`selected-model-strip ${cp ? "" : "missing"}`}>
      <GitBranch size={18} />
      <div>
        <strong>
          {cp
            ? `${params(cp.parameters)} · ${cp.phase} checkpoint`
            : "Choose a model to work on"}
        </strong>
        <span>
          {cp
            ? `${cp.id} · ${cp.treatments.length ? cp.treatments.join(" → ") : "base pretraining weights"}`
            : "Every stage creates a new checkpoint. Earlier models remain available for comparison."}
        </span>
      </div>
      <Button
        help="llm.checkpoints"
        variant="quiet"
        disabled={!!p.running}
        onClick={() => s.page("evaluation")}
      >
        {cp ? "Change checkpoint" : "Select checkpoint"}
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
export function PostTrainingPage({ project: p }: { project: ResearchProject }) {
  const c = p.config,
    s = useResearch(),
    cp = selectedModel(p),
    locked = !!p.running || p.deployed;
  return (
    <>
      <StageHeading
        title="A base model is only the beginning."
        description="Teach behavior, preferences, reasoning, and safe tool use. Each run branches from your selected checkpoint."
      />
      <SelectedModel project={p} />
      <ResearchSection
        stage="domain"
        description="Continue next-token prediction on specialized text. More specialization can mean less general breadth."
      >
        <ConfigFields project={p} group="domain" />
        <TreatmentButton
          project={p}
          type="domain"
          label="Continue pretraining"
        />
      </ResearchSection>
      <ResearchSection
        stage="sft"
        description="Turn a text predictor into an instruction-following assistant."
      >
        <div className="conversation-example">
          <div>
            <b>User</b>
            <p>Explain gravity to a 10-year-old.</p>
          </div>
          <div>
            <b>Assistant</b>
            <p>
              Gravity is the pull between things that have mass. It keeps your
              feet on the ground and the Moon moving around Earth.
            </p>
          </div>
        </div>
        <ConfigFields project={p} group="sft" />
        <p className="research-note">
          Reasoning, coding, and multilingual coverage can overlap. Generate
          synthetic demonstrations below before SFT if you want them included.
        </p>
        <TreatmentButton
          project={p}
          type="sft"
          label="Run instruction tuning"
        />
      </ResearchSection>
      <ResearchSection
        stage="synthetic"
        description="Build a teaching dataset. Generation creates data; the next SFT stage consumes it."
      >
        <ConfigFields project={p} group="synthetic" />
        {cp?.syntheticData && (
          <p className="research-note">
            Selected lineage contains{" "}
            {cp.syntheticData.examples.toLocaleString()} examples from{" "}
            {cp.syntheticData.teacher}. Changing the draft generator does not
            replace this saved dataset.
          </p>
        )}
        <TreatmentButton
          project={p}
          type="synthetic"
          label="Generate teaching examples"
        />
      </ResearchSection>
      <ResearchSection
        stage="preferences"
        description="Compare two answers, build preference pairs, and optionally train a reward predictor."
      >
        <div className="preference-example">
          <h3>Prompt: explain photosynthesis</h3>
          <div>
            <span>Chosen</span>
            <p>
              Plants use light energy to turn water and carbon dioxide into
              sugars, releasing oxygen.
            </p>
            <Check size={17} />
          </div>
          <div>
            <span>Rejected</span>
            <p>Plants absorb food directly from sunlight.</p>
          </div>
        </div>
        <ConfigFields project={p} group="preference" />
        <Facts
          items={[
            {
              label: "Projected reward accuracy",
              value: `${rewardAccuracy(c).toFixed(1)}%`,
              note: "on held-out preference pairs",
            },
            {
              label: "Trained reward accuracy",
              value: cp?.rewardQuality
                ? `${cp.rewardQuality.toFixed(1)}%`
                : "Not trained",
              note: "saved in selected lineage",
            },
          ]}
        />
        <TreatmentButton
          project={p}
          type="reward"
          label="Train a reward model"
        />
        <p className="research-note">
          PPO requires a reward model. DPO, IPO, and ORPO use preference pairs
          directly; the simulator simplifies their method-specific controls.
        </p>
      </ResearchSection>
      <ResearchSection
        stage="alignment"
        description="Optimize preferred behavior while keeping an eye on proxy rewards and actual held-out quality."
      >
        <ConfigFields
          project={p}
          group="alignment"
          names={[
            "method",
            "beta",
            "lr",
            "epochs",
            ...(c.alignment.method === "PPO" ? ["rollout", "normalize"] : []),
          ]}
        />
        {(c.preference.source === "AI judge" ||
          c.preference.source === "Constitutional AI") && (
          <p className="research-note">
            This is an RLAIF path: feedback comes from an AI evaluator. It
            inherits that evaluator’s preferences and blind spots.
          </p>
        )}
        {(c.alignment.beta < 0.03 ||
          c.alignment.epochs > 4 ||
          c.alignment.lr > 0.00005) && (
          <Issues
            issues={[]}
            warnings={[
              "Overoptimization risk: reward may rise while human quality falls. Increase the reference penalty or reduce updates.",
            ]}
          />
        )}
        <TreatmentButton
          project={p}
          type="alignment"
          label={`Run ${c.alignment.method} alignment`}
        />
      </ResearchSection>
      <ResearchSection
        stage="reasoning"
        description="Sample solutions, verify them, then learn from successful attempts."
      >
        <div className="reasoning-flow">
          <span>Problems</span>
          <ArrowRight size={15} />
          <span>{c.reasoning.candidates} candidates</span>
          <ArrowRight size={15} />
          <span>Verifier</span>
          <ArrowRight size={15} />
          <span>Reward & update</span>
        </div>
        <ConfigFields project={p} group="reasoning" />
        <div className="verifier-example">
          <strong>
            {c.reasoning.domain === "Code unit tests"
              ? "Example: 17 / 17 unit tests passed → reward 1"
              : "Example: proposed solution satisfies the checker → reward 1"}
          </strong>
          <p>
            A finite checker can miss edge cases. Verifiable rewards reduce
            annotation cost; they do not eliminate reward hacking.
          </p>
        </div>
        <TreatmentButton
          project={p}
          type="reasoning"
          label="Train on verified reasoning"
        />
      </ResearchSection>
      <ResearchSection
        stage="safety"
        description="Evaluate harmful compliance, privacy, factual abstention, and benign-task refusal together."
      >
        <ConfigFields project={p} group="safety" />
        <div className="research-option-grid">
          {SAFETY_CATEGORIES.map((category) => (
            <label key={category}>
              <input
                type="checkbox"
                checked={c.safety.categories.includes(category)}
                disabled={locked}
                onChange={() =>
                  s.configure("safety", {
                    categories: c.safety.categories.includes(category)
                      ? c.safety.categories.filter((x) => x !== category)
                      : [...c.safety.categories, category],
                  })
                }
              />
              {category}
              <Explain id={`llm.safety.${category}`} />
            </label>
          ))}
        </div>
        <TreatmentButton
          project={p}
          type="safety"
          label="Run safety training"
        />
        <h3 className="research-subheading">
          Teach tools and structured calls
        </h3>
        <div className="research-option-grid">
          {TOOL_OPTIONS.map((tool) => (
            <label key={tool}>
              <input
                type="checkbox"
                checked={c.tools.enabled.includes(tool)}
                disabled={locked}
                onChange={() =>
                  s.configure("tools", {
                    enabled: c.tools.enabled.includes(tool)
                      ? c.tools.enabled.filter((x) => x !== tool)
                      : [...c.tools.enabled, tool],
                  })
                }
              />
              {tool}
              <Explain id={`llm.tool.${tool}`} />
            </label>
          ))}
        </div>
        <ConfigFields project={p} group="tools" />
        <pre className="function-example">
          {JSON.stringify(
            {
              tool: c.tools.enabled[0] ?? "Calculator",
              arguments: { expression: "12 * 7" },
            },
            null,
            2,
          )}
        </pre>
        <p className="research-note">
          Illustrative function call. Tools and code are not executed by this
          simulator.
        </p>
        <TreatmentButton
          project={p}
          type="tools"
          label="Train tool use & function calling"
        />
      </ResearchSection>
    </>
  );
}

export function EvaluationPage({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    cp = selectedModel(p),
    c = contractFor(p.contract);
  const [compare, setCompare] = useState("");
  const other = p.checkpoints.find((x) => x.id === compare);
  const overlap = cp && !cp.config.data.decontaminate ? 7.75 : 0.2;
  const keys = Object.keys(CAPABILITY_LABELS) as Capability[];
  return (
    <>
      <StageHeading
        title="A better score needs better evidence."
        description="Compare public benchmarks, fresh hidden tasks, safety, and the cost of each checkpoint."
      />
      <ResearchSection
        stage="base-eval"
        description="Pretraining evaluations measure multiple abilities. Validation loss alone is not a complete model ranking."
      >
        {!p.checkpoints.length ? (
          <div className="research-empty">
            <ScanIcon />
            <h3>Your evaluation bench is ready.</h3>
            <p>
              Complete or stop a pretraining run to save your first model
              checkpoint.
            </p>
            <Button help="llm.pretraining" onClick={() => s.page("compute")}>
              Open pretraining room
              <ArrowRight size={15} />
            </Button>
          </div>
        ) : (
          <>
            <Facts
              items={[
                {
                  label: "Selected checkpoint",
                  value: cp?.id ?? "None",
                  note: "choose explicitly below",
                },
                {
                  label: "Validation perplexity",
                  value: cp ? Math.exp(cp.loss).toFixed(2) : "—",
                  note: "natural-log cross-entropy",
                },
                {
                  label: "Known public overlap",
                  value: cp
                    ? `${cp.config.data.decontaminate ? 0.2 : 3.1}%`
                    : "—",
                  note: "fresh hidden tasks have no score boost",
                },
              ]}
            />
            <p className="research-note">
              Scores are synthetic benchmark-inspired teaching values. They are
              not official measurements or model-performance forecasts.
              <Explain id="llm.benchmarks" />
            </p>
          </>
        )}
      </ResearchSection>
      <ResearchSection
        stage="capabilities"
        description="Public scores can be inflated by contamination. Hidden columns appear only after an explicit evaluation."
      >
        <div className="research-table-wrap">
          <table className="research-table">
            <thead>
              <tr>
                <th>Capability suite</th>
                <th>Public · selected</th>
                <th>Compare checkpoint</th>
                <th>Hidden release</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const contaminated = [
                  "knowledge",
                  "reasoning",
                  "code",
                  "commonsense",
                  "reading",
                ].includes(key);
                const publicScore = cp
                  ? clamp(cp.scores[key] + (contaminated ? overlap : 0), 0, 99)
                  : null;
                return (
                  <tr key={key}>
                    <td>
                      <strong>{CAPABILITY_LABELS[key]}</strong>
                      {key === c.metric && (
                        <small>Contract target ≥ {c.target}%</small>
                      )}
                    </td>
                    <td>
                      {publicScore?.toFixed(1) ?? "—"}
                      {cp && "%"}
                    </td>
                    <td>
                      {other
                        ? `${other.scores[key].toFixed(1)}% · ${(cp?.scores[key] ?? 0) - other.scores[key] >= 0 ? "+" : ""}${((cp?.scores[key] ?? 0) - other.scores[key]).toFixed(1)} pp`
                        : "—"}
                    </td>
                    <td>
                      {p.report
                        ? `${p.report.scores[key].toFixed(1)}%`
                        : "Not evaluated"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <h3 className="research-subheading">Long-context tests</h3>
        <p className="research-note">
          Needle retrieval, document QA, multi-document reasoning, and
          repository navigation are summarized below. Configured context length
          does not guarantee useful context.
        </p>
        <div className="context-evaluation">
          {[4096, 16384, 32768, 65536, 131072].map((length) => {
            const score = cp
              ? clamp(
                  cp.scores.context -
                    Math.max(
                      0,
                      Math.log2(length / cp.config.sequence.context),
                    ) *
                      12 +
                    (length < cp.config.sequence.context ? 8 : 0),
                  1,
                  98,
                )
              : 0;
            return (
              <div key={length}>
                <span>{length / 1024}K</span>
                <div>
                  <i style={{ width: `${score}%` }} />
                </div>
                <b>{cp ? `${score.toFixed(1)}%` : "—"}</b>
              </div>
            );
          })}
        </div>
        <h3 className="research-subheading">Factuality & calibration</h3>
        <Facts
          items={[
            {
              label: "Factuality",
              value: cp ? `${cp.scores.factuality.toFixed(1)}%` : "—",
              note: "fresh factual question rubric",
            },
            {
              label: "Citation accuracy",
              value: cp
                ? `${clamp(cp.scores.factuality - 8).toFixed(1)}%`
                : "—",
              note: "synthetic citation-validity check",
            },
            {
              label: "Abstention when uncertain",
              value: cp ? `${clamp(cp.scores.safety * 0.65).toFixed(1)}%` : "—",
              note: "higher is not always better",
            },
          ]}
        />
        <h3 className="research-subheading">Tools & multi-step agents</h3>
        <Facts
          items={[
            {
              label: "Tool selection",
              value: cp ? `${clamp(cp.scores.tools + 8).toFixed(1)}%` : "—",
              note: "choose an appropriate tool",
            },
            {
              label: "Argument validity",
              value: cp ? `${clamp(cp.scores.tools + 12).toFixed(1)}%` : "—",
              note: "schema & argument checks",
            },
            {
              label: "Agent completion",
              value: cp ? `${cp.scores.tools.toFixed(1)}%` : "—",
              note: `Planning ${cp ? clamp(cp.scores.reasoning * 0.85).toFixed(1) : "—"}% · ~12 steps/task`,
            },
          ]}
        />
      </ResearchSection>
      <ResearchSection
        stage="redteam"
        description="Search for failures before users do. Adversarial evaluation reveals issues without updating weights."
      >
        <ConfigFields project={p} group="evaluation" />
        <TreatmentButton
          project={p}
          type="redteam"
          label="Run adversarial evaluation"
        />
        {cp?.treatments.includes("redteam") && (
          <div className="redteam-results">
            <ShieldCheck size={25} />
            <div>
              <strong>
                {attackSuccess(cp.scores, p.config).toFixed(1)}% estimated
                discovered attack success
              </strong>
              <p>
                Review privacy, jailbreak, and prompt-injection failures. Train
                safety from an earlier checkpoint to compare remediation
                strategies.
              </p>
            </div>
          </div>
        )}
      </ResearchSection>
      <ResearchSection
        stage="checkpoints"
        description="Choose the exact model artifact to continue training or release. Earlier branches remain intact."
      >
        {p.checkpoints.length > 0 && (
          <>
            <div className="research-table-wrap">
              <table className="research-table checkpoint-table">
                <thead>
                  <tr>
                    <th>Checkpoint</th>
                    <th>Tokens seen</th>
                    <th>Val. loss</th>
                    <th>Primary ability</th>
                    <th>Selection</th>
                  </tr>
                </thead>
                <tbody>
                  {[...p.checkpoints].reverse().map((model) => (
                    <tr
                      key={model.id}
                      className={p.selected === model.id ? "selected" : ""}
                    >
                      <td>
                        <strong>{model.id}</strong>
                        <small>
                          {model.phase} · {params(model.parameters)}
                        </small>
                      </td>
                      <td>{billions(model.tokens)}</td>
                      <td>{model.loss.toFixed(3)}</td>
                      <td>{model.scores[c.metric].toFixed(1)}%</td>
                      <td>
                        <button
                          className="checkpoint-choice"
                          aria-pressed={p.selected === model.id}
                          disabled={!!p.running || p.deployed}
                          onClick={() => s.selectCheckpoint(model.id)}
                        >
                          {p.selected === model.id ? (
                            <>
                              <Check size={14} />
                              Selected
                            </>
                          ) : (
                            "Select"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="checkpoint-comparison">
              Compare against
              <select
                value={compare}
                onChange={(event) => setCompare(event.target.value)}
              >
                <option value="">Choose a comparison</option>
                {p.checkpoints.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id} · {model.phase}
                  </option>
                ))}
              </select>
            </label>
            <p className="research-note">
              Full pretraining states: weights · optimizer · scheduler · RNG ·
              token position. Post-training snapshots preserve their parent’s
              pretraining provenance.
            </p>
          </>
        )}
        <div className="research-actions">
          <Button
            help="llm.checkpoints"
            disabled={!cp || !!p.running || p.deployed}
            onClick={() => s.page("post")}
          >
            Post-train this checkpoint
            <ArrowRight size={15} />
          </Button>
          <Button
            help="llm.serving"
            variant="secondary"
            disabled={!cp}
            onClick={() => s.page("serving")}
          >
            Optimize for serving
          </Button>
        </div>
      </ResearchSection>
      <ResearchSection
        stage="hidden"
        description="Fresh tasks test the selected model after compression. Every serving or model edit requires another release evaluation."
      >
        <SelectedModel project={p} />
        <Button
          help="llm.benchmarks"
          disabled={!cp || !!p.running || p.deployed}
          onClick={s.evaluate}
        >
          Run hidden evaluation
          <ArrowRight size={15} />
        </Button>
        {p.report && (
          <div className={`hidden-report ${p.report.passed ? "passed" : ""}`}>
            <div>
              <h3>
                {p.report.passed
                  ? "Ready for the real-world simulation."
                  : "A result. And a new research question."}
              </h3>
              <strong>
                {p.report.score.toLocaleString()}
                <small> / 10,000 research score</small>
              </strong>
              <p>
                {CAPABILITY_LABELS[c.metric]}:{" "}
                {p.report.scores[c.metric].toFixed(1)}% · target {c.target}%
              </p>
              <p>
                Public-overlap boost removed:{" "}
                {p.report.contaminationGap.toFixed(2)} points on affected
                suites.
              </p>
              {!p.report.passed && p.report.scores[c.metric] < c.target && (
                <p>
                  Improve {c.metric} using the corpus, token budget, or relevant
                  post-training stages.
                </p>
              )}
              <Issues issues={p.report.issues} />
              {p.report.passed && (
                <p>
                  {money(p.report.reward)} payout on deployment · recorded
                  separately from research funds
                </p>
              )}
            </div>
            {p.report.passed && (
              <Button help="llm.serving" onClick={() => s.page("serving")}>
                Prepare release
                <Rocket size={15} />
              </Button>
            )}
          </div>
        )}
      </ResearchSection>
    </>
  );
}
function ScanIcon() {
  return <ShieldCheck size={30} />;
}

export function ServingPage({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    cp = selectedModel(p),
    e = cp ? estimateServing(cp, p.config) : null,
    c = p.config;
  return (
    <>
      <StageHeading
        title="Make capability economical."
        description="A model is only useful if you can fit it, serve it, and afford the next request."
      />
      <SelectedModel project={p} />
      <ResearchSection
        stage="distill"
        description="Let an external teacher guide a smaller student. This creates a new model checkpoint; re-evaluate it before release."
      >
        <ConfigFields
          project={p}
          group="compression"
          names={["distillation", "teacher", "student"]}
        />
        <TreatmentButton
          project={p}
          type="distill"
          label="Distill into a smaller model"
        />
      </ResearchSection>
      <ResearchSection
        stage="quantization"
        description="Compression changes the deployed footprint and capability scores. It leaves saved pretraining curves intact."
      >
        <ConfigFields
          project={p}
          group="compression"
          names={["quantization", "pruning"]}
        />
        {e && (
          <Facts
            items={[
              {
                label: "Model weights",
                value: `${e.weights.toFixed(2)} GB`,
                note: `${params(cp!.parameters)} · ${c.compression.quantization}`,
              },
              {
                label: "Estimated quality loss",
                value: `${e.qualityPenalty.toFixed(1)} pp`,
                note: "applied in hidden release evaluation",
              },
            ]}
          />
        )}
      </ResearchSection>
      <ResearchSection
        stage="inference"
        description="Decode efficiently, manage KV-cache growth, and measure user-perceived speed."
      >
        <ConfigFields
          project={p}
          group="serving"
          names={[
            "continuous",
            "paged",
            "cache",
            "kvPrecision",
            "context",
            "speculative",
            ...(c.serving.speculative ? ["draft", "acceptance"] : []),
          ]}
        />
        {c.serving.speculative && (
          <div className="speculative-example">
            <Sparkles size={19} />
            <p>
              {c.serving.draft}B draft → {params(cp?.parameters ?? 0)} main
              model verification. Correct verification preserves the target
              distribution; acceptance and draft overhead determine speedup.
            </p>
          </div>
        )}
        {e && (
          <Facts
            items={[
              {
                label: "KV cache / sequence",
                value: `${e.kv.toFixed(2)} GB`,
                note: `${c.serving.context.toLocaleString()} token context`,
              },
              {
                label: "Time to first token",
                value: `${e.ttft.toFixed(0)} ms`,
                note: "simulated prefill + admission",
              },
              {
                label: "Decode speed / user",
                value: `${e.speed.toFixed(1)} tok/s`,
                note: `${e.throughput.toFixed(0)} tok/s aggregate`,
              },
            ]}
          />
        )}
      </ResearchSection>
      <ResearchSection
        stage="serving"
        description="Tensor-parallel GPUs share one replica. Additional replicas scale aggregate traffic."
      >
        <ConfigFields
          project={p}
          group="serving"
          names={["gpu", "gpus", "tensor", "batch", "priceIn", "priceOut"]}
        />
        {e && (
          <>
            <Facts
              items={[
                {
                  label: "Memory / replica",
                  value: `${e.memory.toFixed(1)} GB`,
                  note: `${e.capacity} GB replica capacity`,
                },
                {
                  label: "Input compute cost",
                  value: `$${e.inputCost.toFixed(2)} / M`,
                  note: "allocated at full-load utilization",
                },
                {
                  label: "Output compute cost",
                  value: `$${e.outputCost.toFixed(2)} / M`,
                  note: "allocated at full-load utilization",
                },
              ]}
            />
            <Facts
              items={[
                {
                  label: "P95 end-to-end latency",
                  value: `${e.p95.toFixed(2)} s`,
                  note: `at ${c.production.outputTokens} output tokens/request`,
                },
                {
                  label: "Fixed daily GPU cost",
                  value: money(e.dailyCost),
                  note: "charged even when idle",
                },
                {
                  label: "Traffic capacity",
                  value: `${Math.floor(e.requestsCapacity).toLocaleString()}/day`,
                  note: "for your configured input/output lengths",
                },
              ]}
            />
            <Issues issues={e.issues} />
          </>
        )}
      </ResearchSection>
      <ResearchSection
        stage="deploy"
        description="Release the exact checkpoint and serving plan that passed the hidden suite."
      >
        <div className="release-summary">
          <Rocket size={30} />
          <div>
            <h3>
              {p.deployed
                ? `Model v${p.version} is live.`
                : p.report?.passed
                  ? `Model v${p.version} is ready to launch.`
                  : "Evaluate before launch."}
            </h3>
            <p>
              {cp
                ? `${cp.id} · ${params(cp.parameters)} · ${c.compression.quantization}`
                : "Select a checkpoint first."}
            </p>
            <p>
              {p.report?.passed
                ? `Contract payout: ${money(p.report.reward)}. The award is tracked separately from your operating budget.`
                : "A fresh hidden evaluation verifies capability, safety, required research stages, and serving memory."}
            </p>
          </div>
        </div>
        <div className="research-actions">
          <Button
            help="llm.serving"
            disabled={p.deployed || !p.report?.passed || !!p.running}
            onClick={s.deploy}
          >
            <Rocket size={15} />
            Deploy model v{p.version}
          </Button>
          <Button
            help="llm.benchmarks"
            variant="secondary"
            disabled={p.deployed || !cp}
            onClick={() => s.page("evaluation")}
          >
            Open hidden evaluation
            <ArrowRight size={15} />
          </Button>
        </div>
      </ResearchSection>
    </>
  );
}

export function ProductionPage({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    day = p.days.at(-1),
    totalCost = p.days.reduce((n, d) => n + d.cost, 0),
    revenue = p.days.reduce((n, d) => n + d.revenue, 0);
  return (
    <>
      <StageHeading
        title="The launch is the beginning."
        description="Observe the model, pay for traffic, and turn opted-in feedback into its next generation."
      />
      <ResearchSection
        stage="monitoring"
        description="Advance one simulated day at a time. Traffic, latency, failures, revenue, and operating costs evolve from your release settings."
      >
        {!p.deployed && (
          <div className="research-empty">
            <Rocket size={29} />
            <h3>Your production bench is waiting.</h3>
            <p>
              Pass the hidden evaluation and deploy a selected model before
              sending simulated traffic.
            </p>
            <Button help="llm.serving" onClick={() => s.page("serving")}>
              Prepare deployment
              <ArrowRight size={15} />
            </Button>
          </div>
        )}
        <ConfigFields
          project={p}
          group="production"
          names={["requests", "inputTokens", "outputTokens"]}
        />
        <Button help="llm.feedback" disabled={!p.deployed} onClick={s.nextDay}>
          <Play size={15} />
          Simulate next production day
        </Button>
        <Facts
          items={[
            {
              label: "Unique users / day",
              value: day?.users.toLocaleString() ?? "—",
              note: day
                ? `Day ${day.day} · model v${day.version}`
                : "Awaiting release",
            },
            {
              label: "Requests served / demand",
              value: day
                ? `${day.served.toLocaleString()} / ${day.requests.toLocaleString()}`
                : "—",
              note:
                day && day.served < day.requests
                  ? "Capacity reached · excess traffic dropped"
                  : "Requests within serving capacity",
            },
            {
              label: "P95 latency",
              value: day ? `${day.p95.toFixed(2)} s` : "—",
              note: "includes simulated load effects",
            },
          ]}
        />
        <Facts
          items={[
            {
              label: "Hallucination rate",
              value: day ? `${day.hallucination.toFixed(2)}%` : "—",
              note: "synthetic factuality failures",
            },
            {
              label: "Safety violations",
              value: day ? `${day.violations.toFixed(3)}%` : "—",
              note: "synthetic monitoring sample",
            },
            {
              label: "Tool failures",
              value: day ? `${day.toolFailures.toFixed(2)}%` : "—",
              note: "selected model’s tool capability",
            },
          ]}
        />
        <Facts
          items={[
            { label: "Operating cost to date", value: money(totalCost) },
            { label: "Token revenue to date", value: money(revenue) },
            {
              label: "Operating profit / loss",
              value: money(revenue - totalCost),
              note: "contract payout excluded",
            },
          ]}
        />
        {p.days.length > 0 && (
          <div className="research-table-wrap">
            <table className="research-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Requests served</th>
                  <th>P95</th>
                  <th>Cost</th>
                  <th>Revenue</th>
                  <th>Usable feedback</th>
                </tr>
              </thead>
              <tbody>
                {[...p.days].reverse().map((d) => (
                  <tr key={d.day}>
                    <td>{d.day}</td>
                    <td>{d.served.toLocaleString()}</td>
                    <td>{d.p95.toFixed(2)} s</td>
                    <td>{money(d.cost)}</td>
                    <td>{money(d.revenue)}</td>
                    <td>{d.feedback.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ResearchSection>
      <ResearchSection
        stage="feedback"
        description="Research does not end at deployment. Preserve the current release and train the next version on reviewed feedback."
      >
        <ConfigFields
          project={p}
          group="production"
          names={["feedback", "sample"]}
        />
        <div className="flywheel">
          <span>Train</span>
          <ArrowRight size={15} />
          <span>Deploy</span>
          <ArrowRight size={15} />
          <span>Observe</span>
          <ArrowRight size={15} />
          <span>Review feedback</span>
          <ArrowRight size={15} />
          <span>Model v{p.version + 1}</span>
        </div>
        <Facts
          items={[
            {
              label: "Reviewed opt-in examples",
              value: p.feedbackBank.toLocaleString(),
              note: "available for the next SFT generation",
            },
            {
              label: "Archived releases",
              value: p.history.length,
              note: "each keeps its hidden report & production history",
            },
          ]}
        />
        <Button
          help="llm.feedback"
          disabled={!p.deployed || p.feedbackBank === 0}
          onClick={s.nextVersion}
        >
          <GitBranch size={16} />
          Open model v{p.version + 1}
        </Button>
        <p className="research-note">
          The next version inherits the released weights and remaining budget.
          New post-training stages must pass a fresh evaluation before
          deployment.
        </p>
        {p.history.length > 0 && (
          <div className="version-archive">
            <h3>Release archive</h3>
            {p.history.map((version) => (
              <details key={version.version}>
                <summary>
                  Model v{version.version}
                  <span>
                    {version.report.score.toLocaleString()} research score ·{" "}
                    {version.days.length} days live
                  </span>
                </summary>
                <p>
                  {CAPABILITY_LABELS[contractFor(p.contract).metric]}:{" "}
                  {version.report.scores[
                    contractFor(p.contract).metric
                  ].toFixed(1)}
                  % · safety {version.report.scores.safety.toFixed(1)}% ·{" "}
                  {money(version.report.reward)} contract payout
                </p>
              </details>
            ))}
          </div>
        )}
      </ResearchSection>
    </>
  );
}
