import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Focus,
  Layers3,
  Pause,
  Play,
  SkipForward,
} from "lucide-react";
import { useGame, currentConfig } from "../store/gameStore";
import { estimate } from "../game/economy";
import { money } from "../game/catalog";
import { deploymentEstimate } from "../game/scoring";
import {
  comparisonSummary,
  describeChanges,
  describeDeploymentChanges,
  explainEpoch,
  networkLayers,
  projectTraining,
  TRAINING_PHASES,
  type ConfigChange,
  type TrainingPhase,
} from "../game/observatory";
import type { ExperimentConfig } from "../types/game";
import NetworkDiagram from "./NetworkDiagram";
import ObservatoryCurve from "./ObservatoryCurve";
import { ControlHelp, Explain } from "./Help";
import "./observatory.css";

type ChangeEvent = {
  id: number;
  changes: ConfigChange[];
  before: ExperimentConfig;
  after: ExperimentConfig;
  deployment: boolean;
};
const signed = (n: number, digits = 1) =>
  `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

export default function TrainingObservatory() {
  const s = useGame();
  const [expanded, setExpanded] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [source, setSource] = useState("auto");
  const [selected, setSelected] = useState("input");
  const [phase, setPhase] = useState<TrainingPhase>("forward");
  const [chart, setChart] = useState<"accuracy" | "loss">("accuracy");
  const [replayEpoch, setReplayEpoch] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [baseline, setBaseline] = useState<ExperimentConfig | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const snapshot = useRef({
    config: currentConfig(s),
    deployment: s.deployment,
  });
  const serial = useRef(0);
  const draft = useMemo(
    () => currentConfig(s),
    [s.dataset, s.architecture, s.training],
  );
  useEffect(() => {
    const previous = snapshot.current;
    const changes = describeChanges(previous.config, draft);
    const deploymentChanges = describeDeploymentChanges(
      previous.deployment,
      s.deployment,
    );
    snapshot.current = { config: draft, deployment: s.deployment };
    if (!changes.length && !deploymentChanges.length) return;
    if (
      !draft.dataset.samples &&
      previous.config.dataset.samples &&
      !s.experiments.length
    ) {
      setEvents([]);
      setBaseline(null);
      setReplayEpoch(null);
      setPlaying(false);
      setSource("auto");
      return;
    }
    setEvents((history) =>
      [
        {
          id: ++serial.current,
          changes: [...changes, ...deploymentChanges],
          before: previous.config,
          after: draft,
          deployment: !changes.length,
        },
        ...history,
      ].slice(0, 8),
    );
    setReplayEpoch(null);
    setPlaying(false);
    setSource("auto");
  }, [draft, s.deployment, s.experiments.length]);

  const [checkpointExperiment, checkpointEpoch] = s.selectedCheckpoint
    .split(":")
    .map(Number);
  const viewingSaved =
    source !== "draft" &&
    (source !== "auto" || ["results", "deploy"].includes(s.stage));
  const saved =
    source !== "auto" && source !== "draft"
      ? s.experiments.find((e) => String(e.id) === source)
      : (s.experiments.find(
          (e) =>
            e.id ===
            (s.stage === "deploy"
              ? checkpointExperiment
              : s.inspectedExperiment),
        ) ?? s.experiments.at(-1));
  const experiment =
    s.running?.experiment ?? (viewingSaved ? saved : undefined);
  const config = experiment?.config ?? draft;
  const projection = useMemo(() => projectTraining(config), [config]);
  const available = s.running
    ? s.running.cursor
    : experiment
      ? experiment.result.epochs.length
      : (projection.result?.epochs.length ?? 0);
  const epochs = useMemo(
    () =>
      s.running
        ? s.running.experiment.result.epochs.slice(0, s.running.cursor)
        : experiment
          ? experiment.result.epochs
          : (projection.result?.epochs ?? []),
    [s.running, experiment, projection],
  );
  const defaultEpoch =
    !s.running &&
    experiment?.id === checkpointExperiment &&
    checkpointEpoch <= available
      ? checkpointEpoch
      : available;
  const epoch = Math.min(available, replayEpoch ?? defaultEpoch);
  const metric = epochs.find((m) => m.epoch === epoch);
  const footprint = useMemo(() => estimate(config), [config]);
  const layers = useMemo(() => networkLayers(config), [config]);
  const inspected = layers.find((l) => l.id === selected) ?? layers[0];
  const currentPhase = TRAINING_PHASES.find((p) => p.id === phase)!;
  const latest = events[0];
  const comparison = useMemo(
    () => comparisonSummary(baseline ?? latest?.before ?? draft, draft),
    [baseline, latest, draft],
  );
  const comparisonApplies =
    !experiment && !!(baseline || (latest && !latest.deployment));
  const deployed =
    experiment && s.stage === "deploy"
      ? deploymentEstimate(experiment, s.deployment)
      : null;
  const active = (!!s.running && !s.running.paused) || playing;
  const stateLabel = s.running
    ? s.running.paused
      ? "Paused"
      : "Training"
    : experiment
      ? `Saved · ${experiment.result.status.replaceAll("-", " ")}`
      : "Free preview";

  useEffect(() => {
    setReplayEpoch(null);
    setPlaying(false);
  }, [source, experiment?.id, s.selectedCheckpoint, s.stage]);
  useEffect(() => {
    if (!playing || s.running) return;
    const id = setInterval(
      () =>
        setReplayEpoch((e) => {
          const next = (e ?? 0) + 1;
          if (next >= available) setPlaying(false);
          return Math.min(next, available);
        }),
      1000 / s.playbackSpeed,
    );
    return () => clearInterval(id);
  }, [playing, available, s.playbackSpeed, !!s.running]);

  const seek = (value: number) => {
    if (s.running && !s.running.paused) s.pause();
    setPlaying(false);
    setReplayEpoch(Math.min(value, available));
  };
  const play = () => {
    if (s.running) {
      setReplayEpoch(null);
      s.pause();
    } else {
      if (playing) setPlaying(false);
      else {
        if (epoch >= available) setReplayEpoch(0);
        setPlaying(true);
      }
    }
  };
  const step = () => {
    if (s.running) {
      setReplayEpoch(null);
      s.tick(true);
    } else {
      setPlaying(false);
      setReplayEpoch(Math.min(available, epoch + 1));
    }
  };

  return (
    <section
      className={`observatory ${expanded ? "expanded" : ""}`}
      aria-label="Persistent training visualization"
    >
      <div className="observatory-header">
        <div className="observatory-title">
          <Activity size={17} />
          <h2>Learning, in view</h2>
          <Explain id="observatory" />
        </div>
        <span className={`observatory-state ${active ? "active" : ""}`}>
          <i />
          {stateLabel}
        </span>
        <label className="observatory-source">
          <span className="sr-only">Visualization source</span>
          <ControlHelp id="viz.source">
            <select
              aria-label="Visualization source"
              value={source}
              disabled={!!s.running}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="auto">Follow workspace</option>
              <option value="draft">Current draft · preview</option>
              {s.experiments.map((e) => (
                <option key={e.id} value={e.id}>
                  Experiment #{e.id} · saved
                </option>
              ))}
            </select>
          </ControlHelp>
        </label>
        <ControlHelp id="viz.expand">
          <button
            className="observatory-expand"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="learning-observatory-content"
            aria-label={
              expanded
                ? "Compact visualization"
                : "Expand visualization and explanations"
            }
          >
            {expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
            <span>{expanded ? "Compact" : "Explore"}</span>
          </button>
        </ControlHelp>
      </div>
      <div className="observatory-body" id={"learning-observatory-content"}>
        <div className="observatory-network-pane">
          <div className="ob-pane-heading">
            <h3>{config.architecture.name}</h3>
            <label className="ob-detail-toggle">
              <ControlHelp id="viz.layers">
                <input
                  type="checkbox"
                  aria-label="All layers"
                  checked={detailed}
                  onChange={(e) => setDetailed(e.target.checked)}
                />
              </ControlHelp>
              All layers
            </label>
          </div>
          <NetworkDiagram
            config={config}
            active={active}
            phase={phase}
            selected={inspected.id}
            onSelect={(id) => {
              setSelected(id);
              setExpanded(true);
            }}
            detailed={detailed}
            pruning={deployed ? s.deployment.pruning : 0}
          />
          <div className="ob-network-facts">
            <span>{footprint.parameters.toLocaleString()} weights</span>
            <span>{footprint.vram.toFixed(2)} GB VRAM</span>
            <span>{config.dataset.samples.toLocaleString()} images</span>
          </div>
          <div className="ob-layer-detail">
            <strong>
              <Layers3 size={13} />
              {inspected.name}
              <Explain
                id={
                  inspected.kind === "input"
                    ? "resolution"
                    : `layer.${inspected.kind}`
                }
              />
              <span>{inspected.shape}</span>
            </strong>
            <p>
              {inspected.detail}. {inspected.explanation}
            </p>
            {!detailed && inspected.kind === "conv" && (
              <p className="ob-layer-hint">
                This block groups its activation and pooling layers. Enable “All
                layers” to inspect each operation.
              </p>
            )}
          </div>
        </div>
        <div className="observatory-curve-pane">
          <div className="ob-pane-heading">
            <h3>
              {experiment
                ? `Experiment #${experiment.id}`
                : "Simulated forecast"}
            </h3>
            <div
              className="ob-chart-tabs"
              role="group"
              aria-label="Chart metric"
            >
              <ControlHelp id="accuracy">
                <button
                  aria-pressed={chart === "accuracy"}
                  onClick={() => setChart("accuracy")}
                >
                  Accuracy
                </button>
              </ControlHelp>
              <ControlHelp id="lossMetric">
                <button
                  aria-pressed={chart === "loss"}
                  onClick={() => setChart("loss")}
                >
                  Loss
                </button>
              </ControlHelp>
            </div>
          </div>
          <ObservatoryCurve
            epochs={epochs}
            previous={comparisonApplies ? comparison.before?.epochs : undefined}
            epoch={epoch}
            kind={chart}
            onSeek={seek}
          />
          <div className="ob-legend">
            <span>
              <i className="train" />
              Train
            </span>
            <span>
              <i className="validation" />
              Validation
            </span>
            {comparisonApplies && (
              <span>
                <i className="previous" />
                {baseline ? "Baseline" : "Before edit"}
              </span>
            )}
          </div>
          <div className="ob-playback">
            <ControlHelp id="viz.play">
              <button
                onClick={play}
                disabled={!available && !s.running}
                aria-label={
                  active
                    ? "Pause visualization playback"
                    : s.running
                      ? "Resume training from visualization"
                      : "Play epoch replay"
                }
              >
                {active ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </ControlHelp>
            <ControlHelp id="viz.step">
              <button
                onClick={step}
                disabled={
                  s.running
                    ? !s.running.paused
                    : !available || epoch >= available
                }
                aria-label="Advance one epoch"
              >
                <SkipForward size={14} />
              </button>
            </ControlHelp>
            <ControlHelp id="viz.epoch">
              <input
                type="range"
                min="0"
                max={Math.max(1, available)}
                value={epoch}
                disabled={!available}
                onChange={(e) => seek(+e.target.value)}
                aria-label="Inspect epoch"
                aria-valuetext={`Epoch ${epoch} of ${available}`}
              />
            </ControlHelp>
            <span>
              {epoch}/{s.running ? config.training.epochs : available}
            </span>
            <ControlHelp id={`viz.speed.${s.playbackSpeed}`}>
              <select
                aria-label="Visualization playback speed"
                value={s.playbackSpeed}
                onChange={(e) => s.setPlaybackSpeed(+e.target.value)}
              >
                {[0.25, 0.5, 1, 2, 4].map((speed) => (
                  <option key={speed} value={speed}>
                    {speed}×
                  </option>
                ))}
              </select>
            </ControlHelp>
          </div>
          {s.running && replayEpoch !== null && (
            <ControlHelp id="viz.live">
              <button
                className="ob-follow-live"
                onClick={() => setReplayEpoch(null)}
              >
                <Focus size={12} />
                Follow latest epoch
              </button>
            </ControlHelp>
          )}
          <div className="ob-epoch-metrics">
            <span>
              Validation{" "}
              <b>{metric ? `${metric.validationAccuracy.toFixed(1)}%` : "—"}</b>
            </span>
            <span>
              Loss <b>{metric ? metric.validationLoss.toFixed(3) : "—"}</b>
            </span>
            <span>
              LR <b>{(metric?.lr ?? config.training.lr).toPrecision(2)}</b>
            </span>
          </div>
        </div>
        <div className="observatory-explanation-pane">
          <div className="ob-pane-heading">
            <h3>
              {s.running || experiment
                ? `What’s happening · epoch ${epoch}`
                : latest
                  ? "What changed & why"
                  : "Make a change. See the effect."}
            </h3>
            {!experiment && (
              <ControlHelp id="viz.baseline">
                <button
                  className={`ob-baseline ${baseline ? "pinned" : ""}`}
                  onClick={() =>
                    setBaseline(baseline ? null : structuredClone(draft))
                  }
                  aria-pressed={!!baseline}
                >
                  {baseline ? "Unpin baseline" : "Pin baseline"}
                </button>
              </ControlHelp>
            )}
          </div>
          {projection.issues.length > 0 && !experiment ? (
            <div className="ob-issue" role="status">
              <strong>
                {projection.result?.status === "oom"
                  ? "This model exceeds GPU memory"
                  : "Preview needs a valid setup"}
              </strong>
              <p>{projection.issues.join(" ")}</p>
            </div>
          ) : null}
          {s.running || experiment ? (
            <>
              <p className="ob-epoch-explanation">
                {explainEpoch(epochs, epoch)}
              </p>
              {experiment?.result.message && !s.running && (
                <p className="ob-run-message">{experiment.result.message}</p>
              )}
            </>
          ) : latest ? (
            <>
              <div
                className="ob-change-summary"
                aria-live="polite"
                aria-atomic="true"
              >
                <strong>{latest.changes[0].title}</strong>
                <span>
                  {latest.changes[0].before}
                  <ArrowRight size={12} />
                  {latest.changes[0].after}
                  {latest.changes.length > 1 && (
                    <small>+{latest.changes.length - 1} related changes</small>
                  )}
                </span>
                <p>{latest.changes[0].explanation}</p>
              </div>
              {comparisonApplies && (
                <>
                  <p className="ob-impact-caption">
                    Final forecast vs{" "}
                    {baseline ? "pinned baseline" : "previous edit"}
                  </p>
                  <div
                    className="ob-impact-metrics"
                    aria-label="Simulated effect of configuration change"
                  >
                    <span>
                      Val. accuracy{" "}
                      <b>
                        {comparison.accuracy === null
                          ? "—"
                          : `${signed(comparison.accuracy)} pp`}
                      </b>
                    </span>
                    <span>
                      Val. loss{" "}
                      <b>
                        {comparison.loss === null
                          ? "—"
                          : signed(comparison.loss, 3)}
                      </b>
                    </span>
                    <span>
                      VRAM <b>{signed(comparison.memory, 2)} GB</b>
                    </span>
                    <span>
                      Compute cost{" "}
                      <b>
                        {comparison.cost < 0 ? "−" : "+"}
                        {money(Math.abs(comparison.cost))}
                      </b>
                    </span>
                  </div>
                </>
              )}
              {comparisonApplies &&
                comparison.accuracy !== null &&
                Math.abs(comparison.accuracy) < 0.005 && (
                  <p className="ob-no-effect">
                    No measurable final-accuracy change in this simulator.
                    Inspect loss, cost and intermediate epochs; some settings
                    affect only inference or architecture shape.
                  </p>
                )}
            </>
          ) : (
            <p className="ob-intro">
              Your data, layers and training choices are connected. Edit a
              setting anywhere in the lab to see its simulated effect here, then
              select a layer or an epoch to explore why.
            </p>
          )}
          {deployed && (
            <div className="ob-deployment-impact">
              <strong>Inference preview · {s.deployment.quantization}</strong>
              <span>
                {deployed.size.toFixed(2)} MB · {deployed.latency.toFixed(1)} ms
                · {s.deployment.pruning}% pruned
              </span>
              <p>
                {s.evaluation && experiment?.id === checkpointExperiment
                  ? `Hidden evaluation: ${s.evaluation.accuracy.toFixed(1)}% accuracy.`
                  : "Compression affects inference. Training curves remain the saved run’s metrics; hidden accuracy is revealed on evaluation."}
              </p>
            </div>
          )}
          {s.stage === "deploy" && latest?.deployment && (
            <p className="ob-deployment-explanation">
              {latest.changes[0].explanation}
            </p>
          )}
          <div
            className="ob-phase-list"
            role="group"
            aria-label="Explore the training process"
          >
            {TRAINING_PHASES.map((p, i) => (
              <ControlHelp id={`viz.phase.${p.id}`} key={p.id}>
                <button
                  key={p.id}
                  aria-pressed={phase === p.id}
                  onClick={() => {
                    setPhase(p.id);
                    setExpanded(true);
                  }}
                >
                  <span>{i + 1}</span>
                  {p.label}
                </button>
              </ControlHelp>
            ))}
          </div>
          <div className="ob-phase-explanation">
            <strong>{currentPhase.label}</strong>
            <p>{currentPhase.explanation}</p>
            <p className="ob-phase-context">
              {phase === "loss"
                ? `Current loss: ${config.training.loss}.`
                : phase === "update"
                  ? `${config.training.optimizer} · learning rate ${(metric?.lr ?? config.training.lr).toPrecision(3)} · ${config.training.scheduler.toLowerCase()} · weight decay ${config.training.weightDecay}.`
                  : phase === "backward"
                    ? `Gradient clipping: ${config.training.clip > 0 ? config.training.clip : "disabled"}.`
                    : phase === "validate"
                      ? `${config.dataset.split.validation}% held out · ${Math.round((config.dataset.samples * config.dataset.split.validation) / 100).toLocaleString()} validation images. Dropout is disabled.`
                      : `${config.dataset.resolution} × ${config.dataset.resolution} pixels · batch ${config.training.batch} · ${config.dataset.normalization.toLowerCase()}.`}
            </p>
          </div>
        </div>
        {expanded && events.length > 0 && (
          <div className="ob-change-journal">
            <ControlHelp id="viz.history">
              <button
                className="ob-journal-toggle"
                onClick={() => setShowHistory(!showHistory)}
                aria-expanded={showHistory}
              >
                {showHistory ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronUp size={14} />
                )}
                {showHistory ? "Hide" : "Show"} recent changes ({events.length})
              </button>
            </ControlHelp>
            {showHistory && (
              <ol>
                {events.map((event) => (
                  <li key={event.id}>
                    {event.changes.map((change, i) => (
                      <div key={i}>
                        <strong>{change.title}</strong>
                        <span>
                          {change.before} → {change.after}
                        </span>
                        <p>{change.explanation}</p>
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
      {!expanded && (
        <div
          className="ob-mobile-update"
          aria-live={s.running ? "off" : "polite"}
        >
          <span>
            {s.running || experiment
              ? `Epoch ${epoch} · validation ${metric ? `${metric.validationAccuracy.toFixed(1)}%` : "—"}`
              : latest
                ? `${latest.changes[0].title}: ${latest.changes[0].after}`
                : "Edit any setting to see its effect"}
          </span>
          <ControlHelp id="viz.expand">
            <button onClick={() => setExpanded(true)}>
              {comparisonApplies && comparison.accuracy !== null
                ? `${signed(comparison.accuracy)} pp · Why?`
                : "Explore why"}
              <ArrowRight size={11} />
            </button>
          </ControlHelp>
        </div>
      )}
      <div className="observatory-footnote">
        <span>
          {s.running
            ? "Live simulator metrics"
            : experiment
              ? "Saved simulator metrics"
              : "Free what-if preview · no budget spent"}
        </span>
        <span className="ob-visual-disclosure">
          <span className="ob-disclosure-short">
            Illustrative flow · simulated metrics
          </span>
          <span className="ob-disclosure-long">
            Signal flow is illustrative. Metrics are simulated per epoch; no
            real neuron activations or gradients.
          </span>
        </span>
      </div>
    </section>
  );
}
