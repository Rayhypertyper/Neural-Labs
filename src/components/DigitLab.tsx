import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlaskConical,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { useDigits } from "../store/digitStore";
import { useResearch } from "../store/researchStore";
import { DIGIT_SOURCES, estimateDigits } from "../game/digits";
import { money } from "../game/catalog";
import { LearningChart } from "./Charts";
import { Button } from "./ui";
import { Explain } from "./Help";

export default function DigitLab() {
  const s = useDigits(),
    career = useResearch(),
    c = s.config,
    e = estimateDigits(c),
    run = s.running ?? s.runs.at(-1),
    metric = run?.metrics[Math.max(0, run.cursor - 1)];
  const [reset, setReset] = useState(false),
    locked = !!s.running || s.hidden !== null;
  useEffect(() => {
    const id = setInterval(() => useDigits.getState().tick(), 350);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (
      s.hidden !== null &&
      s.hidden >= 96 &&
      !career.completed.includes("digits")
    )
      useResearch.setState((state) => ({
        completed: [...state.completed, "digits"],
      }));
  }, [s.hidden]);
  const field = (
    label: string,
    key:
      | "layers"
      | "width"
      | "dense"
      | "dropout"
      | "lr"
      | "epochs"
      | "batch"
      | "shift"
      | "rotation",
    options: number[],
    help: string,
  ) => (
    <div className="research-field">
      <div className="research-field-label">
        <label htmlFor={`digit-${key}`}>{label}</label>
        <Explain id={help} />
      </div>
      <select
        id={`digit-${key}`}
        value={c[key]}
        disabled={locked}
        onChange={(event) => s.configure({ [key]: Number(event.target.value) })}
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <div className="contract-board digit-lab">
      <header>
        <button className="research-wordmark" onClick={career.showBoard}>
          <FlaskConical size={23} />
          neural<span>labs</span>
        </button>
        <span className="digit-budget">{money(s.budget)} remaining</span>
        <Button
          help="llm.contracts"
          variant="secondary"
          onClick={career.showBoard}
        >
          <ArrowLeft size={15} />
          All contracts
        </Button>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div className="board-intro">
          <div>
            <h1>Read the handwriting.</h1>
            <p>
              Ten classes, from 0 to 9. Learn how model capacity and data
              diversity shape a classifier.
            </p>
          </div>
          <span className="research-version">Postmark · 96% hidden target</span>
        </div>
        <div
          className="digit-specimens"
          aria-label="Illustrative handwritten digit examples"
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit, index) => (
            <span
              key={digit}
              style={{ transform: `rotate(${index % 2 ? 5 : -5}deg)` }}
            >
              {digit}
              <small>CLASS {digit}</small>
            </span>
          ))}
        </div>
        <section className="research-section">
          <div className="research-section-heading">
            <div>
              <h2>
                <span>01</span>Acquire handwriting data
              </h2>
              <p>
                Source diversity determines how well the classifier handles
                unseen writers.
              </p>
            </div>
          </div>
          <div className="digit-datasets">
            {DIGIT_SOURCES.map((source) => (
              <article key={source.id}>
                <h3>{source.name}</h3>
                <p>
                  {source.images.toLocaleString()} images ·{" "}
                  {(source.quality * 100).toFixed(1)}% label quality
                </p>
                <p>
                  {(source.diversity * 100).toFixed(0)}% style diversity ·{" "}
                  {money(source.cost)}
                </p>
                <Button
                  help="package.curated"
                  variant={c.source === source.id ? "primary" : "secondary"}
                  disabled={
                    locked ||
                    (!s.acquired.includes(source.id) && source.cost > s.budget)
                  }
                  onClick={() => s.acquire(source.id)}
                >
                  {c.source === source.id ? (
                    <>
                      <Check size={14} />
                      Selected
                    </>
                  ) : s.acquired.includes(source.id) ? (
                    "Use dataset"
                  ) : (
                    "Acquire dataset"
                  )}
                </Button>
              </article>
            ))}
          </div>
        </section>
        <section className="research-section">
          <div className="research-section-heading">
            <div>
              <h2>
                <span>02</span>Tune a ten-class CNN
              </h2>
              <p>
                28 × 28 grayscale input → convolution / ReLU / pool blocks →
                dense → 10-class softmax
              </p>
            </div>
          </div>
          <div className="research-fields">
            {field(
              "Convolution blocks",
              "layers",
              [1, 2, 3],
              "preset.Balanced CNN",
            )}
            {field("Base filters", "width", [8, 16, 32, 64], "parameters")}
            {field("Dense width", "dense", [32, 64, 128, 256], "parameters")}
            {field(
              "Dropout",
              "dropout",
              [0, 0.1, 0.2, 0.3, 0.5, 0.7],
              "dropout",
            )}
            {field(
              "Learning rate",
              "lr",
              [0.00001, 0.0001, 0.001, 0.01, 0.1],
              "lr",
            )}
            {field("Batch size", "batch", [16, 32, 64, 128, 256], "batch.64")}
            {field("Epochs", "epochs", [5, 10, 20, 30, 50], "epochs")}
            {field(
              "Translation augmentation (%)",
              "shift",
              [0, 5, 10, 15, 20],
              "aug.crop",
            )}
            {field(
              "Rotation augmentation (degrees)",
              "rotation",
              [0, 5, 10, 15, 25],
              "aug.rotation",
            )}
            <label className="research-switch-field">
              <span>
                Normalize pixel intensities
                <Explain id="normalization" />
              </span>
              <input
                type="checkbox"
                checked={c.normalization}
                disabled={locked}
                onChange={(event) =>
                  s.configure({ normalization: event.target.checked })
                }
              />
            </label>
          </div>
          <dl className="research-facts">
            <div>
              <dt>Model parameters</dt>
              <dd>{e.params.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Memory estimate</dt>
              <dd>{e.memory.toFixed(2)} GB</dd>
            </div>
            <div>
              <dt>Training estimate</dt>
              <dd>{money(e.cost)}</dd>
            </div>
          </dl>
        </section>
        <section className="research-section">
          <div className="research-section-heading">
            <div>
              <h2>
                <span>03</span>Run an experiment
              </h2>
              <p>
                Deterministic learning curves. Training, validation, and hidden
                handwriting styles are separate.
              </p>
            </div>
            <div className="research-actions">
              {s.running ? (
                <>
                  <Button
                    help="digits.pause"
                    variant="secondary"
                    onClick={s.pause}
                  >
                    {s.running.paused ? (
                      <Play size={14} />
                    ) : (
                      <Pause size={14} />
                    )}{" "}
                    {s.running.paused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    help="digits.stop"
                    variant="secondary"
                    onClick={s.stop}
                  >
                    <Square size={14} />
                    Stop & refund
                  </Button>
                </>
              ) : (
                <Button
                  help="digits.start"
                  disabled={s.hidden !== null || !c.source || e.cost > s.budget}
                  onClick={s.start}
                >
                  <Play size={15} />
                  Train · {money(e.cost)}
                </Button>
              )}
            </div>
          </div>
          {run ? (
            <>
              <LearningChart epochs={run.metrics.slice(0, run.cursor)} />
              <p>
                Epoch {run.cursor} / {run.metrics.length} · validation{" "}
                {metric?.validationAccuracy.toFixed(2)}% · loss{" "}
                {metric?.validationLoss.toFixed(3)}
              </p>
            </>
          ) : (
            <p className="research-note">
              Choose a dataset and architecture, then train. Larger models can
              fit more patterns but may overfit a small collection.
            </p>
          )}
        </section>
        <section className="research-section">
          <div className="research-section-heading">
            <div>
              <h2>
                <span>04</span>Choose a checkpoint & evaluate
              </h2>
              <p>
                The hidden set contains writers and digit styles your model has
                not seen.
              </p>
            </div>
          </div>
          <div className="digit-runs">
            {s.runs.map((r) => (
              <button
                key={r.id}
                disabled={locked}
                aria-pressed={s.selected === r.id}
                onClick={() => s.select(r.id)}
              >
                <strong>Run #{r.id}</strong>
                <span>
                  {r.config.layers} blocks · {r.config.width} base filters ·{" "}
                  {r.cursor} epochs
                </span>
                <b>
                  {r.metrics.at(-1)!.validationAccuracy.toFixed(2)}% validation
                </b>
                <small>{money(r.cost)} spent</small>
                {s.selected === r.id && <Check size={17} />}
              </button>
            ))}
          </div>
          <Button
            help="submit"
            disabled={locked || s.selected === null}
            onClick={s.evaluate}
          >
            Evaluate selected model
            <ArrowRight size={15} />
          </Button>
          {s.hidden !== null && (
            <div className={`hidden-report ${s.hidden >= 96 ? "passed" : ""}`}>
              <div>
                <h3>
                  {s.hidden >= 96
                    ? "Postmark can read the mail."
                    : "Some handwriting still surprises your model."}
                </h3>
                <strong>
                  {s.hidden.toFixed(2)}%<small> hidden accuracy</small>
                </strong>
                <p>
                  {s.hidden >= 96
                    ? "$8,000 contract payout recorded. Explore your next research question."
                    : "Try more diverse data, moderate augmentation, and a well-fitted architecture in a fresh notebook."}
                </p>
                <Button help="llm.contracts" onClick={career.showBoard}>
                  Explore language-model research
                  <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </section>
        {s.notice && (
          <p className="research-warnings" role="status">
            {s.notice}
          </p>
        )}
        {reset ? (
          <div className="research-actions">
            <p>Erase this digit notebook and start with $15,000?</p>
            <Button
              help="confirmReset"
              variant="danger"
              onClick={() => {
                s.reset();
                setReset(false);
              }}
            >
              Restart digit contract
            </Button>
            <Button
              help="close"
              variant="secondary"
              onClick={() => setReset(false)}
            >
              Keep notebook
            </Button>
          </div>
        ) : (
          <Button help="restart" variant="quiet" onClick={() => setReset(true)}>
            Start a fresh digit notebook
          </Button>
        )}
        <p className="board-footnote">
          All training and evaluation are simulated. No real handwritten-digit
          model is trained.
        </p>
      </main>
    </div>
  );
}
