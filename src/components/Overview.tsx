import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  FlaskConical,
  Layers3,
  Pause,
  Play,
  ScanLine,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useGame, currentConfig } from "../store/gameStore";
import { useResearch } from "../store/researchStore";
import { estimate } from "../game/economy";
import { money, percent } from "../game/catalog";
import { Button } from "./ui";
import { Explain, Help } from "./Help";

gsap.registerPlugin(ScrollTrigger, useGSAP);
export const CAT_IMAGE = "/images/cat.jpg";
export const DOG_IMAGE = "/images/dog.jpg";

export default function Overview() {
  const s = useGame();
  const root = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [runIndex, setRunIndex] = useState(0);
  const [marqueePaused, setMarqueePaused] = useState(false);
  const est = estimate(currentConfig(s));
  const best = Math.max(
    0,
    ...s.experiments.flatMap((e) =>
      e.result.checkpoints.map((c) => c.accuracy),
    ),
  );
  const latest = s.experiments.at(-1);
  const selectedRun = s.experiments.at(
    -1 - Math.min(runIndex, Math.max(0, s.experiments.length - 1)),
  );
  const nextStage = s.evaluation
    ? "deploy"
    : s.dataset.samples
      ? "training"
      : "data";
  const items = [
    {
      id: "data",
      name: "Prepare the data",
      desc: "Good models start with good examples. Build a collection that reflects the real world.",
      detail: s.dataset.samples
        ? `${s.dataset.samples.toLocaleString()} images collected`
        : "Your first step",
      icon: Database,
      done: s.dataset.samples > 0,
    },
    {
      id: "model",
      name: "Shape the model",
      desc: "Choose the layers, find the right capacity, and make an architecture of your own.",
      detail: `${(est.parameters / 1e6).toFixed(2)}M parameters`,
      icon: Layers3,
      done: true,
    },
    {
      id: "training",
      name: "Run an experiment",
      desc: "Watch your model learn. Find the balance between fitting the data and generalizing beyond it.",
      detail: `${s.experiments.length} experiments recorded`,
      icon: FlaskConical,
      done: !!latest,
    },
    {
      id: "deploy",
      name: "Meet the real world",
      desc: "Select a checkpoint and test it against unfamiliar examples. Let the evidence decide.",
      detail: s.evaluation
        ? "Hidden evaluation complete"
        : "90% hidden accuracy target",
      icon: ScanLine,
      done: !!s.evaluation,
    },
  ] as const;

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        "(min-width: 1100px) and (prefers-reduced-motion: no-preference)",
        () => {
          ScrollTrigger.create({
            trigger: ".notebook-section",
            start: "top 110px",
            end: "bottom 420px",
            pin: ".notebook-intro",
            pinSpacing: false,
          });
          gsap.utils
            .toArray<HTMLElement>(".evidence-sheet")
            .forEach((sheet, i) => {
              gsap.fromTo(
                sheet,
                { y: 24 + i * 8 },
                {
                  y: 0,
                  ease: "none",
                  scrollTrigger: {
                    trigger: sheet,
                    start: "top bottom",
                    end: "top 60%",
                    scrub: true,
                  },
                },
              );
            });
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div className="studio-overview" ref={root}>
      <div className="overview-welcome">
        <span>Your research workspace</span>
        <span className="workspace-status">
          <i /> Progress saved locally
        </span>
      </div>
      <section className="specimen-hero" aria-labelledby="mission-title">
        <figure className="hero-specimen specimen-cat">
          <div className="specimen-image">
            <img
              src={CAT_IMAGE}
              width="420"
              height="520"
              fetchPriority="high"
              alt="Black and white cat, an example classifier input"
            />
          </div>
          <figcaption>
            <span>Felis catus</span>
            <span>
              Cat <Check size={12} aria-hidden="true" />
            </span>
          </figcaption>
        </figure>
        <div className="hero-center">
          <h1 id="mission-title">
            Two species.
            <br />
            <span>One great model.</span>
          </h1>
          <p>
            Build a classifier that knows cats from dogs.
            <br className="desktop-break" /> Then discover how well it knows the
            real world.
          </p>
          <div className="hero-actions">
            <Button
              help={`nav.${nextStage}`}
              onClick={() => s.setStage(nextStage)}
            >
              {s.evaluation
                ? "See your results"
                : s.dataset.samples
                  ? "Continue research"
                  : "Begin research"}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Button>
            <Button
              help="llm.contracts"
              variant="secondary"
              onClick={() => useResearch.getState().showBoard()}
            >
              Explore all contracts
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
        <figure className="hero-specimen specimen-dog">
          <div className="specimen-image">
            <img
              src={DOG_IMAGE}
              width="420"
              height="520"
              fetchPriority="high"
              alt="Golden dog, an example classifier input"
            />
          </div>
          <figcaption>
            <span>Canis familiaris</span>
            <span>
              Dog <Check size={12} aria-hidden="true" />
            </span>
          </figcaption>
        </figure>
        <div className="hero-bottom">
          <span>
            Pawprint Labs <span className="hero-separator">/</span> Cats vs Dogs
          </span>
          <a href="#research-workflow">
            Follow your curiosity <ArrowDown size={14} aria-hidden="true" />
          </a>
        </div>
      </section>
      <div className="studio-metrics" aria-label="Current research status">
        <Help id="budget" as="div" className="studio-metric">
          <span>
            Research budget <Explain id="budget" />
          </span>
          <strong>
            {money(s.budget)}
            <small> / $10,000</small>
          </strong>
          <div className="studio-budget-track">
            <i
              style={{
                width: `${Math.max(0, Math.min(100, s.budget / 100))}%`,
              }}
            />
          </div>
        </Help>
        <Help id="history" as="div" className="studio-metric">
          <span>
            Experiments <FlaskConical size={15} aria-hidden="true" />
          </span>
          <strong>
            {String(s.experiments.length).padStart(2, "0")}
            <small> runs recorded</small>
          </strong>
          <p>Every iteration tells you something.</p>
        </Help>
        <Help id="validationAccuracy" as="div" className="studio-metric">
          <span>
            Best validation <Explain id="validationAccuracy" />
          </span>
          <strong>
            {best ? percent(best) : "—"}
            <small>{best ? " best checkpoint" : " ready when you are"}</small>
          </strong>
          <p>One question. A 90% accuracy target.</p>
        </Help>
      </div>
      <section
        className="workflow-section"
        id="research-workflow"
        aria-labelledby="workflow-title"
      >
        <div className="studio-section-heading">
          <div>
            <h2 id="workflow-title">From curiosity to capability.</h2>
            <p>Four steps. A thousand ways to get there.</p>
          </div>
          <span>
            Your research pipeline <ArrowDown size={15} aria-hidden="true" />
          </span>
        </div>
        <div
          className="workflow-accordion"
          style={{
            gridTemplateColumns: items
              .map((_, i) => (i === activeStep ? "1.65fr" : "1fr"))
              .join(" "),
          }}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              className={`workflow-panel ${activeStep === i ? "is-active" : ""}`}
              onMouseEnter={() => setActiveStep(i)}
              onFocus={() => setActiveStep(i)}
              onClick={() => s.setStage(item.id)}
            >
              <span className="workflow-top">
                <item.icon size={22} strokeWidth={1.5} aria-hidden="true" />
                <ArrowUpRight size={18} aria-hidden="true" />
              </span>
              <div>
                <span className="workflow-order">
                  {i + 1}
                  <span> / 4</span>
                </span>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
              </div>
              <span className="workflow-state">
                {item.done ? (
                  <Check size={12} aria-hidden="true" />
                ) : (
                  <span className="workflow-dot" />
                )}
                {item.detail}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="notebook-section" aria-labelledby="notebook-title">
        <div className="notebook-intro">
          <BookOpen size={26} strokeWidth={1.4} aria-hidden="true" />
          <h2 id="notebook-title">
            Small experiments.
            <br />
            <span>New possibilities.</span>
          </h2>
          <p>
            Your notebook is the story of what you tried, what you learned, and
            what comes next.
          </p>
          <Button
            help="nav.results"
            variant="quiet"
            onClick={() => s.setStage("results")}
          >
            Open your notebook <ArrowUpRight size={16} aria-hidden="true" />
          </Button>
        </div>
        <div className="evidence-stack">
          <article className="evidence-sheet notebook-entry">
            <div className="evidence-heading">
              <h3>Research notebook</h3>
              <span>{s.experiments.length} entries</span>
            </div>
            {selectedRun ? (
              <>
                <div className="recorded-run">
                  <span className="entry-icon">
                    <FlaskConical size={23} aria-hidden="true" />
                  </span>
                  <div>
                    <h4>Experiment #{selectedRun.id}</h4>
                    <p>
                      {selectedRun.config.architecture.name} ·{" "}
                      {selectedRun.config.training.optimizer}
                    </p>
                  </div>
                  <strong>
                    {percent(
                      selectedRun.result.finalMetrics.validationAccuracy,
                    )}
                    <small>validation accuracy</small>
                  </strong>
                </div>
                <div className="notebook-carousel">
                  <span>
                    {money(selectedRun.result.trainingCost)} training cost
                  </span>
                  <div>
                    <button
                      disabled={runIndex >= s.experiments.length - 1}
                      onClick={() => setRunIndex(runIndex + 1)}
                      aria-label="Previous experiment"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <button
                      disabled={runIndex === 0}
                      onClick={() => setRunIndex(runIndex - 1)}
                      aria-label="Next experiment"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="studio-empty">
                <div className="empty-pages" aria-hidden="true">
                  <span />
                  <span />
                  <BookOpen size={32} strokeWidth={1.2} />
                </div>
                <h4>The page is yours.</h4>
                <p>
                  Start with a dataset. Follow an idea.
                  <br />
                  Your first experiment will appear here.
                </p>
                <button onClick={() => s.setStage("data")}>
                  Prepare your first dataset{" "}
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </article>
          <article className="evidence-sheet studio-question">
            <span className="question-mark" aria-hidden="true">
              ?
            </span>
            <h3>
              Better data.
              <br />
              Or one more run?
            </h3>
            <p>
              There’s no automatic upgrade. Spend wisely, try an idea, and let
              the results tell the story.
            </p>
            <Button
              help="budget"
              variant="quiet"
              onClick={() => s.setStage("data")}
            >
              Explore your options <ArrowUpRight size={15} aria-hidden="true" />
            </Button>
          </article>
        </div>
      </section>
      <div className={`research-marquee ${marqueePaused ? "is-paused" : ""}`}>
        <div className="marquee-window" aria-hidden="true">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <span key={copy}>
                Question. <i /> Experiment. <i /> Discover. <i /> Repeat. <i />
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setMarqueePaused(!marqueePaused)}
          aria-label={
            marqueePaused ? "Play research marquee" : "Pause research marquee"
          }
        >
          {marqueePaused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
      <div className="studio-close">
        <div>
          <h2>
            Your next breakthrough
            <br />
            starts with a question.
          </h2>
          <p>The lab is yours. See where your curiosity takes you.</p>
        </div>
        <Button help={`nav.${nextStage}`} onClick={() => s.setStage(nextStage)}>
          Back to research <ArrowUpRight size={17} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
