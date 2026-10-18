import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FlaskConical,
  GitCompareArrows,
  ScanLine,
  Target,
  TrendingUp,
} from "lucide-react";
import { useGame } from "../store/gameStore";
import { AUGMENTATIONS, money, percent } from "../game/catalog";
import type { Experiment } from "../types/game";
import { LearningChart } from "./Charts";
import { Button, Empty, SectionHeading, StageHeading } from "./ui";
import { Explain, Help } from "./Help";
export default function Results() {
  const s = useGame();
  const runId = s.inspectedExperiment ?? s.experiments.at(-1)?.id ?? 0;
  const setRunId = s.inspectExperiment;
  const [compare, setCompare] = useState(false);
  const [otherId, setOtherId] = useState(s.experiments.at(-2)?.id ?? 0);
  const [localTest, setLocalTest] = useState(false);
  const run = s.experiments.find((e) => e.id === runId) ?? s.experiments.at(-1);
  const other = s.experiments.find((e) => e.id === otherId);
  if (!run)
    return (
      <>
        <StageHeading
          title="Let the evidence speak."
          description="Your experiments, their outcomes, and the story between them."
        />
        <Empty
          icon={<FlaskConical size={30} />}
          heading="Your first result starts with an idea."
          body="Train a model to see its learning curves, mistakes and saved checkpoints here."
          button={
            <Button help="nav.training" onClick={() => s.setStage("training")}>
              Configure your first experiment
              <ArrowRight size={15} />
            </Button>
          }
        />
      </>
    );
  const m = run.result.finalMetrics;
  const catN = Math.round(
    ((run.config.dataset.samples * run.config.dataset.split.validation) / 100) *
      run.config.dataset.catRatio,
  );
  const dogN =
    Math.round(
      (run.config.dataset.samples * run.config.dataset.split.validation) / 100,
    ) - catN;
  const correctCat = Math.round((catN * m.catRecall) / 100),
    correctDog = Math.round((dogN * m.dogRecall) / 100);
  const best = Math.max(0, ...run.result.checkpoints.map((c) => c.accuracy));
  return (
    <>
      <StageHeading
        title="Every run tells a story."
        description="Compare your ideas. Follow the evidence. Keep the checkpoint you believe in."
        action={
          <Button
            help="compare"
            variant="secondary"
            disabled={s.experiments.length < 2}
            onClick={() => setCompare(!compare)}
          >
            <GitCompareArrows size={15} />
            {compare ? "Close comparison" : "Compare runs"}
          </Button>
        }
      />
      <section className="history-panel">
        <div className="history-header">
          <h3>
            <FlaskConical size={16} /> Research notebook{" "}
            <Explain id="history" />
          </h3>
          <span>
            {s.experiments.length} run{s.experiments.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>EXPERIMENT</th>
                <th>MODEL</th>
                <th>BEST VALIDATION</th>
                <th>COST</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {s.experiments.map((e) => (
                <tr
                  key={e.id}
                  className={e.id === run.id ? "selected" : ""}
                  onClick={() => {
                    setRunId(e.id);
                    setLocalTest(false);
                  }}
                >
                  <td>
                    <Help id="history">
                      <button
                        className="table-run-button"
                        onClick={() => setRunId(e.id)}
                      >
                        #{String(e.id).padStart(2, "0")}
                        <span className="selected-indicator" />
                      </button>
                    </Help>
                  </td>
                  <td>{e.config.architecture.name}</td>
                  <td className="teal">
                    {e.result.checkpoints.length
                      ? percent(
                          Math.max(
                            ...e.result.checkpoints.map((c) => c.accuracy),
                          ),
                        )
                      : "—"}
                  </td>
                  <td>{money(e.result.trainingCost)}</td>
                  <td>
                    <span
                      className={`status ${e.result.status === "completed" ? "ready" : ""}`}
                    >
                      {e.result.status.replace("-", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {compare && (
        <section className="panel comparison-panel">
          <SectionHeading
            title="What changed?"
            description="A comparison is most useful when you change one thing at a time."
          />
          <div className="comparison-select">
            <span>Experiment #{run.id} →</span>
            <Help id="compare">
              <select
                value={otherId}
                onChange={(e) => setOtherId(+e.target.value)}
                aria-label="Compare with experiment"
              >
                <option value={0}>Choose a second run</option>
                {s.experiments
                  .filter((e) => e.id !== run.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      Experiment #{e.id}
                    </option>
                  ))}
              </select>
            </Help>
          </div>
          {other && <Comparison a={run} b={other} />}
        </section>
      )}
      <SectionHeading
        title={`Experiment #${String(run.id).padStart(2, "0")}`}
        description={`${run.config.architecture.name} · ${run.config.training.optimizer} · LR ${run.config.training.lr} · ${run.result.epochs.length} / ${run.config.training.epochs} epochs`}
        action={
          <Button
            help="nav.model"
            variant="secondary"
            onClick={() => s.setStage("model")}
          >
            Try another idea
            <ArrowRight size={14} />
          </Button>
        }
      />
      {run.evaluations?.map(({ epoch, result }, index) => (
        <p className="small-note" key={index}>
          Saved evaluation · Epoch {epoch} · {result.score.toLocaleString()} /
          10,000 points · {percent(result.accuracy)} hidden accuracy · Contract{" "}
          {result.passed ? "passed" : "evaluated"}
        </p>
      ))}
      {!run.result.epochs.length ? (
        <div className="inline-notice warning">
          {run.result.message ??
            "This experiment has no completed epochs or checkpoints."}
        </div>
      ) : (
        <>
          <div className="result-metrics">
            {[
              {
                label: "Train accuracy",
                help: "trainAccuracy",
                value: percent(m.trainAccuracy),
                color: "purple",
              },
              {
                label: "Validation accuracy",
                help: "validationAccuracy",
                value: percent(m.validationAccuracy),
                color: "teal",
              },
              {
                label: "Precision",
                help: "precision",
                value: percent(m.precision),
              },
              { label: "Recall", help: "recall", value: percent(m.recall) },
              { label: "F1 score", help: "f1", value: percent(m.f1) },
            ].map((x) => (
              <Help key={x.help} id={x.help} as="div">
                <span>
                  {x.label}
                  <Explain id={x.help} />
                </span>
                <strong className={x.color}>{x.value}</strong>
              </Help>
            ))}
          </div>
          <div className="live-chart-grid">
            <LearningChart epochs={run.result.epochs} />
            <LearningChart epochs={run.result.epochs} kind="loss" />
          </div>
          <div className="results-detail-grid">
            <section className="panel confusion-panel">
              <SectionHeading
                title="Where did it get confused?"
                action={<Explain id="confusion" />}
              />
              <Help id="confusion" as="div" className="confusion-matrix">
                <div className="matrix-predicted">PREDICTED</div>
                <div className="matrix-row">
                  <span />
                  <span>Cat</span>
                  <span>Dog</span>
                </div>
                <div className="matrix-row">
                  <span>Cat</span>
                  <strong className="correct">
                    {correctCat.toLocaleString()}
                    <small>correct cats</small>
                  </strong>
                  <strong className="incorrect">
                    {(catN - correctCat).toLocaleString()}
                    <small>missed cats</small>
                  </strong>
                </div>
                <div className="matrix-row">
                  <span>Dog</span>
                  <strong className="incorrect">
                    {(dogN - correctDog).toLocaleString()}
                    <small>missed dogs</small>
                  </strong>
                  <strong className="correct">
                    {correctDog.toLocaleString()}
                    <small>correct dogs</small>
                  </strong>
                </div>
                <div className="class-recalls">
                  <span>
                    Cat recall <b>{percent(m.catRecall)}</b>
                  </span>
                  <span>
                    Dog recall <b>{percent(m.dogRecall)}</b>
                  </span>
                </div>
              </Help>
            </section>
            <section className="panel">
              <SectionHeading
                title="Beyond the easy examples"
                description="Simulated failure categories, based on this experiment’s coverage."
                action={<Explain id="mistakes" />}
              />
              <Help id="mistakes" as="div" className="mistake-list">
                {[
                  {
                    title: "A black dog after sunset",
                    detail: `${Math.round(run.config.dataset.night * 100)}% low-light coverage`,
                    icon: ScanLine,
                  },
                  {
                    title: "A cat behind a garden fence",
                    detail: `${run.config.dataset.augmentation.crop}% crop augmentation`,
                    icon: Target,
                  },
                  {
                    title: "An unfamiliar breed",
                    detail: `${Math.round(run.config.dataset.diversity * 100)}% distribution coverage`,
                    icon: TrendingUp,
                  },
                ].map((x) => (
                  <div key={x.title}>
                    <span>
                      <x.icon size={18} />
                    </span>
                    <div>
                      <h4>{x.title}</h4>
                      <p>{x.detail}</p>
                    </div>
                  </div>
                ))}
              </Help>
              <Help id="localTest" as="div" className="local-test-row">
                <button
                  className="local-test-button"
                  onClick={() => setLocalTest(true)}
                >
                  {localTest
                    ? `Local holdout: ${percent(Math.max(1, m.validationAccuracy - (1 - run.config.dataset.diversity) * 3 - 0.6))} · ${Math.round((run.config.dataset.samples * run.config.dataset.split.test) / 100).toLocaleString()} images`
                    : "Inspect reserved local test split"}
                </button>
                <Explain id="localTest" />
              </Help>
            </section>
          </div>
          <SectionHeading
            title="A moment worth keeping"
            description="Every completed epoch is a checkpoint. Choose one explicitly; the latest isn’t always best."
            action={<Explain id="checkpoint" />}
          />
          <div className="checkpoint-list">
            {run.result.checkpoints
              .filter(
                (c, i, all) =>
                  i === 0 ||
                  i === all.length - 1 ||
                  c.accuracy === best ||
                  i % Math.max(1, Math.floor(all.length / 6)) === 0,
              )
              .map((c) => (
                <Help key={c.id} id="checkpoint" as="div">
                  <button
                    disabled={!!s.evaluation}
                    className={`checkpoint-card ${s.selectedCheckpoint === `${run.id}:${c.epoch}` ? "selected" : ""}`}
                    onClick={() => s.setCheckpoint(`${run.id}:${c.epoch}`)}
                  >
                    <div>
                      <span className="radio-mark">
                        {s.selectedCheckpoint === `${run.id}:${c.epoch}` && (
                          <i />
                        )}
                      </span>
                      <strong>Epoch {c.epoch}</strong>
                      {c.accuracy === best && (
                        <span className="best-tag">BEST</span>
                      )}
                    </div>
                    <b>{percent(c.accuracy)}</b>
                    <small>validation accuracy</small>
                  </button>
                </Help>
              ))}
          </div>
          <Help id="checkpoint">
            <label className="all-checkpoints">
              Or select any completed epoch
              <select
                value={
                  s.selectedCheckpoint.startsWith(`${run.id}:`)
                    ? s.selectedCheckpoint
                    : ""
                }
                disabled={!!s.evaluation}
                onChange={(e) => s.setCheckpoint(e.target.value)}
                aria-label="Select any checkpoint"
              >
                <option value="">Choose checkpoint</option>
                {run.result.checkpoints.map((c) => (
                  <option value={`${run.id}:${c.epoch}`} key={c.id}>
                    Epoch {c.epoch} · {percent(c.accuracy)}
                  </option>
                ))}
              </select>
            </label>
          </Help>
        </>
      )}
      <div className="stage-footer">
        <span>
          {s.selectedCheckpoint
            ? `Checkpoint selected · experiment #${s.selectedCheckpoint.split(":")[0]}, epoch ${s.selectedCheckpoint.split(":")[1]}`
            : "Select a checkpoint to prepare your submission."}
        </span>
        <Button
          help="nav.deploy"
          onClick={() => s.setStage("deploy")}
          disabled={!s.selectedCheckpoint}
        >
          Prepare deployment
          <ArrowRight size={15} />
        </Button>
      </div>
    </>
  );
}
function Comparison({ a, b }: { a: Experiment; b: Experiment }) {
  const rows = [
    [
      "Sources",
      Object.entries(a.config.dataset.packages)
        .map(([k, v]) => `${k} ×${v}`)
        .join(", "),
      Object.entries(b.config.dataset.packages)
        .map(([k, v]) => `${k} ×${v}`)
        .join(", "),
    ],
    ["Dataset samples", a.config.dataset.samples, b.config.dataset.samples],
    [
      "Cat distribution",
      percent(a.config.dataset.catRatio * 100),
      percent(b.config.dataset.catRatio * 100),
    ],
    ["Resolution", a.config.dataset.resolution, b.config.dataset.resolution],
    [
      "Normalization",
      a.config.dataset.normalization,
      b.config.dataset.normalization,
    ],
    ["Sampling", a.config.dataset.sampling, b.config.dataset.sampling],
    [
      "Train / validation / test",
      Object.values(a.config.dataset.split).join(" / "),
      Object.values(b.config.dataset.split).join(" / "),
    ],
    [
      "Cleaning",
      a.config.dataset.cleaned.join(", ") || "None",
      b.config.dataset.cleaned.join(", ") || "None",
    ],
    ...AUGMENTATIONS.map((x) => [
      x.name,
      `${a.config.dataset.augmentation[x.id]}${x.unit}`,
      `${b.config.dataset.augmentation[x.id]}${x.unit}`,
    ]),
    [
      "Label quality",
      percent(a.config.dataset.labelQuality * 100),
      percent(b.config.dataset.labelQuality * 100),
    ],
    ["Architecture", a.config.architecture.name, b.config.architecture.name],
    ["Parameters", a.estimate.parameters, b.estimate.parameters],
    [
      "Layer configuration",
      a.config.architecture.layers
        .map(
          (l) =>
            `${l.kind} ${l.kind === "conv" ? `${l.width} k${l.kernel} s${l.stride} ${l.padding}` : l.kind === "dense" ? l.width : l.kind === "relu" ? l.activation : ""}`,
        )
        .join(" → "),
      b.config.architecture.layers
        .map(
          (l) =>
            `${l.kind} ${l.kind === "conv" ? `${l.width} k${l.kernel} s${l.stride} ${l.padding}` : l.kind === "dense" ? l.width : l.kind === "relu" ? l.activation : ""}`,
        )
        .join(" → "),
    ],
    ["Optimizer", a.config.training.optimizer, b.config.training.optimizer],
    ["Learning rate", a.config.training.lr, b.config.training.lr],
    ["Dropout", a.config.training.dropout, b.config.training.dropout],
    [
      "Weight decay",
      a.config.training.weightDecay,
      b.config.training.weightDecay,
    ],
    ["Batch", a.config.training.batch, b.config.training.batch],
    ["Scheduler", a.config.training.scheduler, b.config.training.scheduler],
    ["Loss", a.config.training.loss, b.config.training.loss],
    ["Momentum", a.config.training.momentum, b.config.training.momentum],
    ["Warmup", a.config.training.warmup, b.config.training.warmup],
    ["Gradient clipping", a.config.training.clip, b.config.training.clip],
    [
      "Early stopping",
      a.config.training.earlyStopping
        ? `Patience ${a.config.training.patience}`
        : "Disabled",
      b.config.training.earlyStopping
        ? `Patience ${b.config.training.patience}`
        : "Disabled",
    ],
    ["Hardware", a.config.training.hardware, b.config.training.hardware],
    ["Epoch budget", a.config.training.epochs, b.config.training.epochs],
    ["Seed", a.config.training.seed, b.config.training.seed],
    ["Epochs completed", a.result.epochs.length, b.result.epochs.length],
    [
      "Validation accuracy",
      percent(a.result.finalMetrics.validationAccuracy),
      percent(b.result.finalMetrics.validationAccuracy),
    ],
    [
      "Training cost",
      money(a.result.trainingCost),
      money(b.result.trainingCost),
    ],
  ];
  return (
    <div className="history-table-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>DECISION</th>
            <th>EXPERIMENT #{a.id}</th>
            <th>EXPERIMENT #{b.id}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, x, y]) => (
            <tr key={name} className={x !== y ? "changed" : ""}>
              <td>{name}</td>
              <td>{x}</td>
              <td>
                {y}
                {x !== y && <span className="change-dot" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
