import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Flag,
  FlaskConical,
  PackageCheck,
  Rocket,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useGame } from "../store/gameStore";
import { money, percent } from "../game/catalog";
import { deploymentEstimate } from "../game/scoring";
import {
  Button,
  Empty,
  Field,
  SectionHeading,
  Select,
  StageHeading,
} from "./ui";
import { Explain, Help } from "./Help";
export default function Deploy() {
  const s = useGame();
  const [confirm, setConfirm] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [id, epoch] = s.selectedCheckpoint.split(":").map(Number);
  const e = s.experiments.find((e) => e.id === id);
  const cp = e?.result.checkpoints.find((c) => c.epoch === epoch);
  const deploy = s.deployment;
  const est = e ? deploymentEstimate(e, deploy) : null;
  const final = s.evaluation;
  const submit = () => {
    setConfirm(false);
    setRevealing(true);
    setTimeout(() => {
      s.submit();
      setRevealing(false);
    }, 2200);
  };
  if (revealing)
    return (
      <div className="evaluation-reveal">
        <span className="reveal-scan">
          <ScanLine size={42} />
        </span>
        <h1>Meet the real world.</h1>
        <p>
          Testing unfamiliar breeds, imperfect images, and a different kind of
          light…
        </p>
        <div className="reveal-line">
          <i />
        </div>
      </div>
    );
  if (final && e && cp)
    return (
      <>
        <StageHeading
          title={
            final.passed
              ? "A breakthrough. Built by you."
              : "A result worth learning from."
          }
          description={
            final.passed
              ? "Your model met the contract. Your decisions made the difference."
              : "Your model missed the hidden target. The evidence below explains the gap."
          }
          action={
            <span className={`status ${final.passed ? "ready" : ""}`}>
              {final.passed ? <Check size={13} /> : <Flag size={13} />}Contract{" "}
              {final.passed ? "complete" : "evaluated"}
            </span>
          }
        />
        <section
          className={`final-score-panel ${final.passed ? "passed" : ""}`}
        >
          <div className="trophy-wrap">
            {final.passed ? <Trophy size={40} /> : <FlaskConical size={40} />}
          </div>
          <div>
            <Help id="score">
              <span className="small-label">
                FINAL RESEARCH SCORE <Explain id="score" />
              </span>
              <h2>
                {final.score.toLocaleString()}
                <small> / 10,000</small>
              </h2>
            </Help>
            <p>
              {final.passed
                ? "A model is more than a single metric. This one is yours."
                : "Every unsuccessful experiment is information for your next lab."}
            </p>
          </div>
          <Help id="reward" as="div" className="reward-amount">
            <span>
              Contract payout <Explain id="reward" />
            </span>
            <strong>{money(final.reward)}</strong>
            <small>
              {final.passed
                ? "Reward recorded"
                : "90% hidden accuracy required"}
            </small>
          </Help>
        </section>
        <div className="evaluation-comparison">
          <Help id="validationAccuracy" as="div">
            <span>
              VISIBLE VALIDATION <Explain id="validationAccuracy" />
            </span>
            <strong>{percent(cp.accuracy)}</strong>
            <p>The examples you could learn from.</p>
          </Help>
          <ArrowRight size={24} />
          <Help id="accuracy" as="div">
            <span>
              HIDDEN EVALUATION <Explain id="accuracy" />
            </span>
            <strong className="teal">{percent(final.accuracy)}</strong>
            <p>A world your model hadn’t seen.</p>
          </Help>
        </div>
        <div className="bonus-strip">
          {[
            { label: "Accuracy ≥ 90%", done: final.accuracy >= 90 },
            { label: "Bonus accuracy ≥ 95%", done: final.accuracy >= 95 },
            { label: "Latency ≤ 20 ms", done: final.latency <= 20 },
            { label: "Size ≤ 50 MB", done: final.size <= 50 },
          ].map((x) => (
            <Help key={x.label} id="contract">
              <span className={x.done ? "met" : ""}>
                {x.done ? <Check size={13} /> : <span className="status-dot" />}
                {x.label}
              </span>
            </Help>
          ))}
        </div>
        <div className="results-detail-grid">
          <section className="panel">
            <SectionHeading
              title="The unfamiliar conditions"
              description="Distribution shift exposes gaps that validation can miss."
              action={<Explain id="diversity" />}
            />
            <div className="hidden-slices">
              {final.slices.map((x) => (
                <Help id="diversity" key={x.name} as="div">
                  <div>
                    <span>{x.name}</span>
                    <b>{percent(x.accuracy)}</b>
                  </div>
                  <div className="slice-bar">
                    <i style={{ width: `${x.accuracy}%` }} />
                  </div>
                </Help>
              ))}
            </div>
            <p className="small-note">
              Coverage, lighting, augmentation and the train–validation gap all
              shape these results.
            </p>
          </section>
          <section className="panel">
            <SectionHeading
              title="What your score is made of"
              action={<Explain id="score" />}
            />
            <div className="score-breakdown">
              {final.components.map((c) => (
                <Help key={c.name} id="score" as="div">
                  <span>{c.name}</span>
                  <strong>
                    {c.score.toLocaleString()}
                    <small> / {c.max.toLocaleString()}</small>
                  </strong>
                </Help>
              ))}
            </div>
            <div className="score-footprint">
              <span>{final.latency.toFixed(1)} ms inference</span>
              <span>{final.size.toFixed(1)} MB model</span>
              <span>{money(s.budget)} remaining</span>
            </div>
          </section>
        </div>
        <div className="stage-footer">
          <span>
            Experiment #{e.id} · Epoch {cp.epoch} · {deploy.quantization}
          </span>
          <Button
            help="nav.results"
            variant="secondary"
            onClick={() => s.setStage("results")}
          >
            Revisit your research
            <ArrowRight size={15} />
          </Button>
        </div>
      </>
    );
  return (
    <>
      <StageHeading
        title="The world is your final test."
        description="Choose your checkpoint. Balance size and speed. Find out what generalizes."
      />
      {!cp || !e || !est ? (
        <Empty
          icon={<PackageCheck size={32} />}
          heading="First, choose what you’ll stand behind."
          body="Train an experiment and explicitly select a completed checkpoint in Results. Your final epoch is not always your strongest model."
          button={
            <Button help="nav.results" onClick={() => s.setStage("results")}>
              Choose a checkpoint
              <ArrowRight size={15} />
            </Button>
          }
        />
      ) : (
        <>
          <section className="selected-checkpoint">
            <span className="selected-checkpoint-icon">
              <PackageCheck size={26} />
            </span>
            <div>
              <span className="small-label">SELECTED CHECKPOINT</span>
              <h2>
                Experiment #{e.id} <span>/</span> Epoch {cp.epoch}
              </h2>
              <p>
                {e.config.architecture.name} · {e.config.training.optimizer} ·{" "}
                {percent(cp.accuracy)} validation accuracy
              </p>
            </div>
            <Button
              help="checkpoint"
              variant="secondary"
              onClick={() => s.setStage("results")}
            >
              Change checkpoint
            </Button>
          </section>
          <div className="training-layout">
            <section className="panel">
              <SectionHeading
                title="Make it ready for the world"
                description="Deployment is another set of tradeoffs. Smaller and faster may cost accuracy."
              />
              <div className="field-grid">
                <Field label="Weight precision" help="quantization">
                  <Select
                    help="quantization"
                    value={deploy.quantization}
                    options={["FP32", "FP16", "INT8"]}
                    onChange={(v) => s.setDeployment({ quantization: v })}
                  />
                </Field>
                <Field label="Inference hardware" help="inferenceHardware">
                  <Select
                    help="inferenceHardware"
                    value={deploy.hardware}
                    options={["CPU", "Lab GPU", "Edge accelerator"]}
                    onChange={(v) => s.setDeployment({ hardware: v })}
                  />
                </Field>
                <Field label="Pruning" help="pruning">
                  <div className="range-value">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={deploy.pruning}
                      onChange={(e) =>
                        s.setDeployment({ pruning: +e.target.value })
                      }
                      aria-label="Pruning percentage"
                    />
                    <strong>{deploy.pruning}%</strong>
                  </div>
                </Field>
                <Field label="Inference batch size" help="inferenceBatch">
                  <Select
                    help="inferenceBatch"
                    value={deploy.batch}
                    options={[1, 2, 4, 8, 16]}
                    onChange={(v) => s.setDeployment({ batch: +v })}
                  />
                </Field>
              </div>
              <div className="deployment-estimates">
                <Help id="size">
                  <span>
                    Estimated model size <Explain id="size" />
                  </span>
                  <strong>{est.size.toFixed(1)} MB</strong>
                </Help>
                <Help id="latency">
                  <span>
                    Estimated inference <Explain id="latency" />
                  </span>
                  <strong>{est.latency.toFixed(1)} ms</strong>
                </Help>
              </div>
            </section>
            <aside className="submission-panel">
              <ShieldCheck size={27} />
              <h2>Beyond your validation set.</h2>
              <p>
                The client’s hidden images include new lighting, rare breeds,
                unusual backgrounds and partially obscured animals.
              </p>
              <p>
                Once submitted, this contract is final. Your notebook will
                remain available.
              </p>
              <Button
                help="submit"
                disabled={!!s.running}
                onClick={() => setConfirm(true)}
              >
                Review final submission
                <Rocket size={15} />
              </Button>
              <span className="small-note">No additional compute charge.</span>
            </aside>
          </div>
          <SectionHeading title="The contract, at a glance" />
          <div className="contract-objectives">
            {[
              { label: "Required accuracy", value: "≥90%", help: "accuracy" },
              { label: "Bonus accuracy", value: "≥95%", help: "accuracy" },
              { label: "Latency bonus", value: "≤20 ms", help: "latency" },
              { label: "Model size bonus", value: "≤50 MB", help: "size" },
            ].map((x) => (
              <Help key={x.label} id={x.help} as="div">
                <span>
                  {x.label}
                  <Explain id={x.help} />
                </span>
                <strong>{x.value}</strong>
              </Help>
            ))}
          </div>
        </>
      )}
      {confirm && (
        <div className="modal-backdrop" onClick={() => setConfirm(false)}>
          <section
            className="modal submission-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm final submission"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <h2>This is your model.</h2>
              <Button
                help="close"
                variant="quiet"
                onClick={() => setConfirm(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <p>
              Submit experiment #{id}, epoch {epoch} with {deploy.quantization}{" "}
              weights and {deploy.pruning}% pruning. Validation accuracy is{" "}
              {cp ? percent(cp.accuracy) : "—"}. Hidden evaluation may differ.
            </p>
            <div className="inline-notice">
              Submission finalizes this contract. Review your checkpoint and
              deployment choices before proceeding.
            </div>
            <div className="modal-actions">
              <Button
                help="close"
                variant="secondary"
                onClick={() => setConfirm(false)}
              >
                Keep researching
              </Button>
              <Button help="submit" onClick={submit}>
                Submit to hidden test
                <Rocket size={15} />
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
