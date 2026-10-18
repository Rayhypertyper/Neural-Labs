import {
  Activity,
  Check,
  Cpu,
  FlaskConical,
  Gauge,
  Pause,
  Play,
  Square,
  Wallet,
  Zap,
} from "lucide-react";
import { useGame, currentConfig } from "../store/gameStore";
import {
  estimate,
  validateArchitecture,
  validateDataset,
} from "../game/economy";
import {
  BATCHES,
  HARDWARE,
  LOSSES,
  OPTIMIZERS,
  SCHEDULERS,
  money,
  percent,
} from "../game/catalog";
import { LearningChart } from "./Charts";
import {
  Button,
  Field,
  SectionHeading,
  Select,
  StageHeading,
  Toggle,
} from "./ui";
import { Explain, Help } from "./Help";
export default function TrainingRoom() {
  const s = useGame();
  const t = s.training;
  const est = estimate(currentConfig(s));
  const locked = !!s.running || !!s.evaluation;
  const errors = [
    ...validateDataset(s.dataset),
    ...validateArchitecture(s.architecture),
  ];
  const last = s.experiments.at(-1);
  const failure =
    last && ["oom", "diverged"].includes(last.result.status) ? last : null;
  const select = (
    label: string,
    help: string,
    value: string | number,
    options: (string | number)[],
    update: (s: string) => void,
  ) => (
    <Field label={label} help={help}>
      <Select
        help={
          help === "optimizer"
            ? `optimizer.${value}`
            : help === "batch"
              ? `batch.${value}`
              : help === "scheduler"
                ? `schedule.${value}`
                : help === "loss"
                  ? `loss.${value}`
                  : help
        }
        value={value}
        options={options}
        onChange={update}
        disabled={locked}
      />
    </Field>
  );
  return (
    <>
      <StageHeading
        title={
          s.running ? "Watch your idea learn." : "Set the learning in motion."
        }
        description={
          s.running
            ? "A simulation of your decisions, one epoch at a time."
            : "Your strategy, your compute, your experiment. No automatic tuning."
        }
        action={
          <span className="simulation-tag">
            <FlaskConical size={14} />
            Experiment #{s.experiments.length + 1}
          </span>
        }
      />
      {s.running ? (
        <LiveTraining />
      ) : (
        <>
          <div className="training-layout">
            <div>
              <section className="panel">
                <SectionHeading
                  title="Learning strategy"
                  description="Small updates, repeated. Choose how your model finds its way."
                />
                <div className="field-grid">
                  {select(
                    "Optimizer",
                    "optimizer",
                    t.optimizer,
                    OPTIMIZERS,
                    (v) => s.updateTraining({ optimizer: v }),
                  )}
                  {select("Loss function", "loss", t.loss, LOSSES, (v) =>
                    s.updateTraining({ loss: v }),
                  )}
                  <Field
                    label="Learning rate"
                    help="lr"
                    detail="Log scale · 0.000001 to 1"
                  >
                    <div className="lr-input">
                      <input
                        type="number"
                        min=".000001"
                        max="1"
                        step=".0001"
                        value={t.lr}
                        disabled={locked}
                        onChange={(e) =>
                          s.updateTraining({ lr: +e.target.value })
                        }
                        aria-label="Learning rate"
                      />
                      <span>η</span>
                    </div>
                    <input
                      type="range"
                      min="-6"
                      max="0"
                      step=".1"
                      value={Math.log10(Math.max(0.000001, t.lr))}
                      disabled={locked}
                      onChange={(e) =>
                        s.updateTraining({
                          lr: +(10 ** +e.target.value).toPrecision(3),
                        })
                      }
                      aria-label="Logarithmic learning rate"
                    />
                  </Field>
                  {select("Batch size", "batch", t.batch, BATCHES, (v) =>
                    s.updateTraining({ batch: +v }),
                  )}
                  <Field label="Epochs" help="epochs">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={t.epochs}
                      disabled={locked}
                      onChange={(e) =>
                        s.updateTraining({
                          epochs: Math.max(
                            1,
                            Math.min(120, Math.round(+e.target.value)),
                          ),
                        })
                      }
                      aria-label="Training epochs"
                    />
                  </Field>
                  {select(
                    "Training hardware",
                    "hardware",
                    t.hardware,
                    Object.keys(HARDWARE),
                    (v) => s.updateTraining({ hardware: v }),
                  )}
                </div>
              </section>
              <section className="panel">
                <SectionHeading
                  title="Keep learning. Avoid memorizing."
                  description="Regularization trades training fit for a chance at better generalization."
                />
                <div className="field-grid">
                  <Field label="Dropout" help="dropout">
                    <div className="range-value">
                      <input
                        type="range"
                        min="0"
                        max=".8"
                        step=".05"
                        value={t.dropout}
                        disabled={locked}
                        onChange={(e) =>
                          s.updateTraining({ dropout: +e.target.value })
                        }
                        aria-label="Dropout"
                      />
                      <strong>{t.dropout.toFixed(2)}</strong>
                    </div>
                  </Field>
                  <Field label="Weight decay" help="weightDecay">
                    <input
                      type="number"
                      min="0"
                      max=".1"
                      step=".0001"
                      value={t.weightDecay}
                      disabled={locked}
                      onChange={(e) =>
                        s.updateTraining({
                          weightDecay: Math.max(
                            0,
                            Math.min(0.1, +e.target.value),
                          ),
                        })
                      }
                      aria-label="Weight decay"
                    />
                  </Field>
                </div>
              </section>
              <section className="panel">
                <SectionHeading
                  title="The finer controls"
                  description="Tune the training schedule and keep your experiments reproducible."
                />
                <div className="field-grid">
                  {select(
                    "Learning-rate scheduler",
                    "scheduler",
                    t.scheduler,
                    SCHEDULERS,
                    (v) => s.updateTraining({ scheduler: v }),
                  )}
                  <Field label="Warmup epochs" help="warmup">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={t.warmup}
                      disabled={locked}
                      onChange={(e) =>
                        s.updateTraining({
                          warmup: Math.max(0, Math.min(20, +e.target.value)),
                        })
                      }
                      aria-label="Warmup epochs"
                    />
                  </Field>
                  <Field label="Momentum" help="momentum">
                    <input
                      type="number"
                      min="0"
                      max=".99"
                      step=".05"
                      value={t.momentum}
                      disabled={locked || !t.optimizer.includes("Momentum")}
                      onChange={(e) =>
                        s.updateTraining({
                          momentum: Math.max(
                            0,
                            Math.min(0.99, +e.target.value),
                          ),
                        })
                      }
                      aria-label="Momentum"
                    />
                  </Field>
                  <Field
                    label="Gradient clipping"
                    help="clip"
                    detail="0 = disabled"
                  >
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step=".5"
                      value={t.clip}
                      disabled={locked}
                      onChange={(e) =>
                        s.updateTraining({
                          clip: Math.max(0, Math.min(10, +e.target.value)),
                        })
                      }
                      aria-label="Gradient clipping"
                    />
                  </Field>
                  <Field label="Random seed" help="seed">
                    <input
                      type="number"
                      min="0"
                      max="999999"
                      value={t.seed}
                      disabled={locked}
                      onChange={(e) =>
                        s.updateTraining({
                          seed: Math.max(0, Math.round(+e.target.value)),
                        })
                      }
                      aria-label="Random seed"
                    />
                  </Field>
                  <Field label="Early stopping" help="earlyStopping">
                    <div className="early-stopping">
                      <Toggle
                        help="earlyStopping"
                        label="Early stopping"
                        checked={t.earlyStopping}
                        disabled={locked}
                        onChange={() =>
                          s.updateTraining({ earlyStopping: !t.earlyStopping })
                        }
                      />
                      <span>{t.earlyStopping ? "Enabled" : "Disabled"}</span>
                    </div>
                  </Field>
                  {t.earlyStopping && (
                    <Field label="Patience" help="patience">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={t.patience}
                        disabled={locked}
                        onChange={(e) =>
                          s.updateTraining({
                            patience: Math.max(
                              1,
                              Math.min(30, +e.target.value),
                            ),
                          })
                        }
                        aria-label="Early stopping patience"
                      />
                    </Field>
                  )}
                </div>
              </section>
            </div>
            <aside className="run-summary">
              <div className="run-summary-heading">
                <FlaskConical size={18} />
                <span>EXPERIMENT #{s.experiments.length + 1}</span>
              </div>
              <h2>Ready for a discovery?</h2>
              <p>Review your experiment before committing the compute.</p>
              <dl>
                <dt>DATA</dt>
                <dd>
                  {Math.round(
                    (s.dataset.samples * s.dataset.split.train) / 100,
                  ).toLocaleString()}{" "}
                  training images
                </dd>
                <dd>
                  {Math.round(s.dataset.catRatio * 100)}% cats /{" "}
                  {Math.round((1 - s.dataset.catRatio) * 100)}% dogs
                </dd>
                <dt>MODEL</dt>
                <dd>{s.architecture.name}</dd>
                <dd>
                  {(est.parameters / 1e6).toFixed(2)}M parameters ·{" "}
                  {est.vram.toFixed(1)} GB VRAM
                </dd>
                <dt>TRAINING</dt>
                <dd>
                  {t.optimizer} · LR {t.lr}
                </dd>
                <dd>
                  Batch {t.batch} · {t.epochs} epochs
                </dd>
                <dd>Dropout {t.dropout.toFixed(2)}</dd>
              </dl>
              <Help id="cost" as="div" className="summary-cost">
                <span>
                  Estimated cost <Explain id="cost" />
                </span>
                <strong>{money(est.cost)}</strong>
              </Help>
              <Help id="budget" as="div" className="summary-after">
                <span>Budget after training</span>
                <b className={s.budget < est.cost ? "negative" : ""}>
                  {money(s.budget - est.cost)}
                </b>
              </Help>
              <Button
                help="train.start"
                disabled={
                  locked ||
                  errors.length > 0 ||
                  est.cost > s.budget ||
                  !Number.isFinite(t.lr) ||
                  t.lr < 0.000001 ||
                  t.lr > 1
                }
                onClick={s.start}
              >
                <Play size={15} />
                Approve {money(est.cost)} & train
              </Button>
              <div className="summary-disclaimer">
                <Check size={12} />
                Unused compute is refunded.
              </div>
              {errors.length > 0 && (
                <div className="summary-error">{errors[0]}</div>
              )}
              {est.cost > s.budget && (
                <div className="summary-error">
                  This run exceeds your remaining budget.
                </div>
              )}
            </aside>
          </div>
          {failure && (
            <div className="inline-notice warning">
              <Activity size={18} />
              <div>
                <strong>
                  {failure.result.status === "oom"
                    ? "GPU memory exhausted"
                    : "Training diverged"}
                </strong>
                <p>{failure.result.message}</p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
function LiveTraining() {
  const s = useGame();
  const r = s.running!;
  const epochs = r.experiment.result.epochs.slice(0, r.cursor);
  const m = epochs.at(-1);
  const total = r.experiment.config.training.epochs;
  const best = Math.max(0, ...epochs.map((m) => m.validationAccuracy));
  const hardware =
    HARDWARE[r.experiment.config.training.hardware as keyof typeof HARDWARE];
  return (
    <>
      <div className="live-training-header">
        <span className={`training-pulse ${r.paused ? "paused" : ""}`} />
        <div>
          <h2>{r.paused ? "Experiment paused" : "Learning in progress"}</h2>
          <p>
            Epoch {r.cursor} / {total} · {r.experiment.config.architecture.name}
          </p>
        </div>
        <div className="live-training-actions">
          <Button
            help={r.paused ? "train.resume" : "train.pause"}
            variant="secondary"
            onClick={s.pause}
          >
            {r.paused ? <Play size={14} /> : <Pause size={14} />}{" "}
            {r.paused ? "Resume" : "Pause"}
          </Button>
          <Button help="train.stop" variant="secondary" onClick={s.stop}>
            <Square size={12} />
            Stop
          </Button>
        </div>
      </div>
      <div className="training-progress">
        <i style={{ transform: `scaleX(${r.cursor / total})` }} />
      </div>
      <div className="live-metrics">
        {[
          {
            label: "Train accuracy",
            help: "trainAccuracy",
            value: m ? percent(m.trainAccuracy) : "—",
            color: "purple",
          },
          {
            label: "Validation accuracy",
            help: "validationAccuracy",
            value: m ? percent(m.validationAccuracy) : "—",
            color: "teal",
          },
          {
            label: "Train loss",
            help: "lossMetric",
            value: m ? m.trainLoss.toFixed(3) : "—",
            color: "",
          },
          {
            label: "Validation loss",
            help: "lossMetric",
            value: m ? m.validationLoss.toFixed(3) : "—",
            color: "",
          },
        ].map((x, i) => (
          <Help key={i} id={x.help} as="div">
            <span>
              {x.label}
              <Explain id={x.help} />
            </span>
            <strong className={x.color}>{x.value}</strong>
          </Help>
        ))}
      </div>
      <div className="live-chart-grid">
        <LearningChart epochs={epochs} />
        <LearningChart epochs={epochs} kind="loss" />
      </div>
      <div className="compute-strip">
        <Help id="hardware">
          <Cpu size={17} />
          <span>
            GPU utilization <b>{m ? m.utilization.toFixed(0) : 0}%</b>
          </span>
        </Help>
        <Help id="vram">
          <Gauge size={17} />
          <span>
            VRAM{" "}
            <b>
              {r.experiment.estimate.vram.toFixed(1)} / {hardware.vram} GB
            </b>
          </span>
        </Help>
        <Help id="checkpoint">
          <Check size={17} />
          <span>
            Best validation <b>{percent(best)}</b>
          </span>
        </Help>
        <Help id="cost">
          <Wallet size={17} />
          <span>
            Completed compute{" "}
            <b>
              {money(Math.ceil(r.cursor * r.experiment.estimate.epochCost))}
            </b>
          </span>
        </Help>
      </div>
      <div className="live-training-note">
        <Zap size={19} />
        <div>
          <h3>Watch the gap, not just the number.</h3>
          <p>
            Training accuracy measures fit. Validation accuracy gives you
            evidence about generalization. Their relationship tells a story.
          </p>
        </div>
      </div>
    </>
  );
}
