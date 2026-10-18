import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronRight,
  Clock3,
  Database,
  FlaskConical,
  Gauge,
  Layers3,
  Play,
  ScanLine,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useGame, currentConfig } from "../store/gameStore";
import { estimate } from "../game/economy";
import { money, percent } from "../game/catalog";
import { Button, SectionHeading, StageHeading } from "./ui";
import { Explain, Help } from "./Help";
export const CAT_IMAGE = "/images/cat.jpg";
export const DOG_IMAGE = "/images/dog.jpg";
export default function Overview() {
  const s = useGame();
  const est = estimate(currentConfig(s));
  const best = Math.max(
    0,
    ...s.experiments.flatMap((e) =>
      e.result.checkpoints.map((c) => c.accuracy),
    ),
  );
  const latest = s.experiments.at(-1);
  const items = [
    {
      id: "data",
      name: "Prepare your data",
      desc: s.dataset.samples
        ? `${s.dataset.samples.toLocaleString()} images in your collection`
        : "Good models start with good examples.",
      icon: Database,
      done: s.dataset.samples > 0,
    },
    {
      id: "model",
      name: "Design your model",
      desc: `${s.architecture.name} · ${(est.parameters / 1e6).toFixed(2)}M parameters`,
      icon: Layers3,
      done: true,
    },
    {
      id: "training",
      name: "Run an experiment",
      desc: latest
        ? `${s.experiments.length} experiment${s.experiments.length === 1 ? "" : "s"} in your notebook`
        : "Find the balance between fit and generalization.",
      icon: FlaskConical,
      done: s.experiments.length > 0,
    },
    {
      id: "deploy",
      name: "Put it to the test",
      desc: s.evaluation
        ? "Hidden evaluation complete"
        : "The real world is the final judge.",
      icon: ScanLine,
      done: !!s.evaluation,
    },
  ] as const;
  return (
    <>
      <StageHeading
        title="Your next breakthrough."
        description="A new question. A fixed budget. A model that’s yours."
        action={
          <Help id="contract">
            <span className="mission-badge">
              <Sparkles size={13} />
              Your first research mission
            </span>
          </Help>
        }
      />
      <section className="contract-panel">
        <div className="contract-copy">
          <h2>
            Two species.
            <br />
            One great model.
          </h2>
          <div className="contract-topline">
            <span className="contract-tag">
              {s.evaluation ? "CONTRACT EVALUATED" : "ACTIVE CONTRACT"}
            </span>
            <span>PAWPRINT LABS</span>
          </div>
          <p>
            Build a classifier that knows cats from dogs.
            <br />
            Then find out how well it knows the real world.
          </p>
          <Button
            help="nav.data"
            onClick={() =>
              s.setStage(
                s.evaluation
                  ? "deploy"
                  : s.dataset.samples
                    ? "training"
                    : "data",
              )
            }
          >
            {s.evaluation
              ? "See your results"
              : s.dataset.samples
                ? "Continue research"
                : "Begin research"}
            <ArrowRight size={16} />
          </Button>
          <div className="contract-meta">
            <span>
              <Target size={13} />
              90% hidden accuracy
            </span>
            <span>
              <Zap size={13} />
              {money(5000)} base reward
            </span>
            <Explain id="contract" />
          </div>
        </div>
        <div className="contract-art" aria-label="Cat and dog classifier">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="classifier-node">
            <ScanLine size={22} />
          </div>
          <div className="animal-card cat">
            <img
              src={CAT_IMAGE}
              alt="A tabby cat, representative classifier input"
            />
            <span>
              <i />
              CAT <Check size={11} />
            </span>
          </div>
          <div className="animal-card dog">
            <img
              src={DOG_IMAGE}
              alt="A golden retriever, representative classifier input"
            />
            <span>
              <i />
              DOG <Check size={11} />
            </span>
          </div>
          <div className="art-label">
            <span className="live-dot" /> BUILT BY YOU
          </div>
        </div>
      </section>
      <div className="overview-stats">
        <Help id="budget" as="div" className="overview-stat">
          <div className="stat-label">
            <span>Research budget</span>
            <Explain id="budget" />
          </div>
          <strong>
            {money(s.budget)}
            <small> / $10,000</small>
          </strong>
          <div className="budget-line">
            <i style={{ width: `${s.budget / 100}%` }} />
          </div>
        </Help>
        <Help id="history" as="div" className="overview-stat">
          <div className="stat-label">
            <span>Experiments</span>
            <FlaskConical size={15} />
          </div>
          <strong>
            {String(s.experiments.length).padStart(2, "0")}
            <small> runs recorded</small>
          </strong>
          <span className="stat-foot">
            Every iteration teaches you something.
          </span>
        </Help>
        <Help id="validationAccuracy" as="div" className="overview-stat">
          <div className="stat-label">
            <span>Best validation</span>
            <TrendingUp size={15} />
          </div>
          <strong>
            {best ? percent(best) : "—"}
            <small>{best ? " best checkpoint" : " the first run awaits"}</small>
          </strong>
          <span className="stat-foot">
            Target <b>90.0%</b>
          </span>
        </Help>
      </div>
      <SectionHeading
        title="From idea to inference"
        description="Your research pipeline. Every decision makes a difference."
      />
      <div className="pipeline-overview">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Help
              id={`nav.${item.id}`}
              key={item.id}
              as="div"
              className="pipeline-step-wrap"
            >
              <button
                className={`pipeline-step ${item.done ? "done" : ""}`}
                onClick={() => s.setStage(item.id)}
              >
                <div className="pipeline-step-top">
                  <span className="step-icon">
                    <Icon size={20} />
                  </span>
                  <span className="step-number">0{i + 1}</span>
                </div>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
                <span className="step-state">
                  {item.done ? (
                    <>
                      <Check size={12} />
                      Ready to explore
                    </>
                  ) : (
                    <>
                      Get started <ArrowUpRight size={12} />
                    </>
                  )}
                </span>
              </button>
            </Help>
          );
        })}
      </div>
      <div className="overview-bottom">
        <section className="recent-research">
          <SectionHeading
            title="Research notebook"
            action={
              <Button
                help="nav.results"
                variant="quiet"
                onClick={() => s.setStage("results")}
              >
                View all <ArrowRight size={13} />
              </Button>
            }
          />
          {latest ? (
            <div className="recent-run">
              <span className="run-icon">
                <FlaskConical size={20} />
              </span>
              <div>
                <strong>Experiment #{latest.id}</strong>
                <p>
                  {latest.config.architecture.name} ·{" "}
                  {latest.config.training.optimizer}
                </p>
              </div>
              <div>
                <strong>
                  {percent(latest.result.finalMetrics.validationAccuracy)}
                </strong>
                <p>{money(latest.result.trainingCost)}</p>
              </div>
            </div>
          ) : (
            <div className="notebook-empty">
              <span className="notebook-lines">
                <FlaskConical size={24} />
              </span>
              <div>
                <h3>The page is yours.</h3>
                <p>
                  Your experiments will appear here.
                  <br />
                  Start with a dataset and follow your curiosity.
                </p>
              </div>
            </div>
          )}
        </section>
        <section className="research-thought">
          <div>
            <span className="thought-icon">
              <Zap size={17} />
            </span>
            <h3>Better data or one more run?</h3>
          </div>
          <p>
            There’s no automatic upgrade. Spend wisely, try an idea, and let the
            results tell the story.
          </p>
          <Button
            help="budget"
            variant="quiet"
            onClick={() => s.setStage("data")}
          >
            Explore your options <ArrowRight size={13} />
          </Button>
        </section>
      </div>
    </>
  );
}
