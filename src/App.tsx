import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cpu,
  Database,
  FlaskConical,
  Grid2X2,
  Layers3,
  Leaf,
  Menu,
  PanelLeftClose,
  RotateCcw,
  ScanLine,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useGame } from "./store/gameStore";
import type { Stage } from "./types/game";
import { money, percent } from "./game/catalog";
import {
  EducationProvider,
  Explain,
  Help,
  useInspector,
} from "./components/Help";
import { Button, Select } from "./components/ui";
import Overview from "./components/Overview";
import DataStudio from "./components/DataStudio";
import ModelBuilder from "./components/ModelBuilder";
import TrainingRoom from "./components/TrainingRoom";
import Results from "./components/Results";
import Deploy from "./components/Deploy";
import TrainingObservatory from "./components/TrainingObservatory";
import { useResearch } from "./store/researchStore";
const ContractBoard = lazy(() => import("./components/ContractBoard"));
const ResearchLab = lazy(() => import("./components/ResearchLab"));
const DigitLab = lazy(() => import("./components/DigitLab"));
const NAV = [
  { id: "overview", label: "Overview", icon: Grid2X2 },
  { id: "data", label: "Data studio", icon: Database },
  { id: "model", label: "Model builder", icon: Layers3 },
  { id: "training", label: "Training room", icon: FlaskConical },
  { id: "results", label: "Results", icon: Activity },
  { id: "deploy", label: "Deploy & evaluate", icon: ScanLine },
] as const;
export default function App() {
  return (
    <EducationProvider>
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      <Suspense
        fallback={
          <div className="research-loading" role="status">
            Opening your research workspace…
          </div>
        }
      >
        <ResearchRouter />
      </Suspense>
    </EducationProvider>
  );
}
function ResearchRouter() {
  const research = useResearch();
  const passed = useGame((s) => s.evaluation?.passed);
  useEffect(() => {
    if (passed) research.recordTutorial();
  }, [passed]);
  useEffect(() => {
    const id = setInterval(
      () => useResearch.getState().tickAll(),
      1000 / research.speed,
    );
    return () => clearInterval(id);
  }, [research.speed]);
  if (research.board) return <ContractBoard />;
  if (research.active === "digits") return <DigitLab />;
  if (research.active !== "cats") return <ResearchLab key={research.active} />;
  return <Lab />;
}
function Lab() {
  const s = useGame();
  const inspector = useInspector();
  const [menu, setMenu] = useState(false);
  const [reset, setReset] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [s.stage]);
  useEffect(() => {
    if (!menu) return;
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  useEffect(() => {
    const id = setInterval(
      () => useGame.getState().tick(),
      1000 / s.playbackSpeed,
    );
    return () => clearInterval(id);
  }, [s.playbackSpeed]);
  useEffect(() => {
    if (!s.notice) return;
    const id = setTimeout(s.clearNotice, 6500);
    return () => clearTimeout(id);
  }, [s.notice]);
  const label = NAV.find((n) => n.id === s.stage)?.label ?? "Overview";
  const best = Math.max(
    0,
    ...s.experiments.flatMap((e) =>
      e.result.checkpoints.map((c) => c.accuracy),
    ),
  );
  const navigate = (id: Stage) => {
    s.setStage(id);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <div className="app-shell has-observatory">
      <aside
        ref={sidebar}
        id="lab-navigation"
        className={`sidebar ${menu ? "open" : ""}`}
      >
        <Help id="nav.overview">
          <button
            className="brand"
            onClick={() => navigate("overview")}
            aria-label="Neural Labs overview"
          >
            <span className="brand-mark">
              <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path
                  d="M6 20V8l8 12V8M14 8h8v12"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="7" r="2" fill="currentColor" />
                <circle cx="22" cy="21" r="2" fill="currentColor" />
              </svg>
            </span>
            <span>
              neural<span className="brand-light">labs</span>
              <small>A LITTLE CURIOSITY GOES A LONG WAY</small>
            </span>
          </button>
        </Help>
        <div className="lab-switch">
          <span className="workspace-avatar">
            <FlaskConical size={17} />
          </span>
          <div>
            <strong>Your research lab</strong>
            <small>
              <span className="live-dot" />
              All systems operational
            </small>
          </div>
        </div>
        <div className="nav-label">Your workspace</div>
        <button
          className="tutorial-contract-switch"
          onClick={() => useResearch.getState().showBoard()}
        >
          <Grid2X2 size={16} />
          All six research contracts
          <ChevronRight size={14} />
        </button>
        <nav aria-label="Research pipeline">
          {NAV.map((n) => (
            <Help key={n.id} id={`nav.${n.id}`} as="div">
              <button
                className={`nav-item ${s.stage === n.id ? "active" : ""}`}
                onClick={() => navigate(n.id)}
                aria-current={s.stage === n.id ? "page" : undefined}
              >
                <n.icon size={18} />
                <span>{n.label}</span>
                {n.id === "training" && s.running ? (
                  <span className="live-dot" />
                ) : (n.id === "data" && s.dataset.samples > 0) ||
                  (n.id === "results" && s.experiments.length > 0) ||
                  (n.id === "deploy" && s.evaluation) ? (
                  <Check size={13} className="nav-check" />
                ) : n.id === "results" && s.experiments.length > 0 ? (
                  <span className="nav-count">{s.experiments.length}</span>
                ) : null}
              </button>
            </Help>
          ))}
        </nav>
        <section className="sidebar-contract">
          <Help id="contract">
            <h3>
              Cats vs Dogs <Explain id="contract" />
            </h3>
          </Help>
          <p>Two classes. Endless possibilities.</p>
          <div className="mini-objective">
            <TargetIcon />
            <span>Target accuracy</span>
            <strong>90%</strong>
          </div>
          <div className="contract-progress">
            <i style={{ width: `${Math.min(100, (best / 90) * 100)}%` }} />
          </div>
          <Help id="validationAccuracy">
            <span className="contract-progress-label">
              {best
                ? `${percent(best)} best validation`
                : "Awaiting your first experiment"}
            </span>
          </Help>
        </section>
        <div className="sidebar-bottom">
          <Help id="difficulty" as="div">
            <div className="nav-label">
              Learning mode <Explain id="difficulty" />
            </div>
            <Select
              help="difficulty"
              value={s.difficulty}
              options={["Beginner", "Standard", "Expert"]}
              onChange={s.setDifficulty}
            />
          </Help>
          <Help id="pin">
            <button
              className="sidebar-help"
              onClick={() => inspector.pin("contract")}
            >
              <BookOpen size={17} />
              <span>Field guide</span>
              <ArrowUpRight size={14} />
            </button>
          </Help>
          <div className="sidebar-footer">
            <span>
              NEURAL LABS <b>v1.0</b>
            </span>
            <Help id="restart">
              <button onClick={() => setReset(true)} aria-label="Reset lab">
                <RotateCcw size={14} />
              </button>
            </Help>
          </div>
        </div>
      </aside>
      {menu && (
        <div className="mobile-nav-scrim" onClick={() => setMenu(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Help id="nav.overview">
              <button
                className="mobile-menu icon-button"
                ref={menuButton}
                onClick={() => setMenu(!menu)}
                aria-label="Toggle navigation"
                aria-controls="lab-navigation"
                aria-expanded={menu}
              >
                <Menu size={20} />
              </button>
            </Help>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{label}</strong>
          </div>
          <div className="topbar-right">
            <Help id="budget">
              <div className="topbar-budget">
                <Wallet size={15} />
                <span>{money(s.budget)}</span>
                <small>remaining</small>
                <Explain id="budget" />
              </div>
            </Help>
            <span className="topbar-divider" />
            <Help id="contract">
              <span className="avatar" title="Your lab">
                NL
              </span>
            </Help>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          key={s.stage}
          className="workspace"
        >
          {s.evaluation && s.stage !== "deploy" && (
            <div className="completion-banner">
              <Check size={15} />
              Contract evaluated. Your research notebook is preserved.
              <Button
                help="nav.deploy"
                variant="quiet"
                onClick={() => s.setStage("deploy")}
              >
                See your score
                <ChevronRight size={13} />
              </Button>
            </div>
          )}
          {s.stage === "overview" ? (
            <Overview />
          ) : s.stage === "data" ? (
            <DataStudio />
          ) : s.stage === "model" ? (
            <ModelBuilder />
          ) : s.stage === "training" ? (
            <TrainingRoom />
          ) : s.stage === "results" ? (
            <Results />
          ) : (
            <Deploy />
          )}
          <footer className="workspace-footer">
            <span>
              <span className="live-dot" />{" "}
              {s.running
                ? "EXPERIMENT IN PROGRESS"
                : "YOUR IDEAS. YOUR EXPERIMENTS. YOUR BREAKTHROUGH."}
            </span>
            <Help id="seed">
              <span>
                Deterministic simulation <Explain id="seed" />
              </span>
            </Help>
          </footer>
        </main>
      </div>
      <TrainingObservatory />
      {s.notice && (
        <div className="toast" role="status">
          <InfoIcon />
          <span>{s.notice}</span>
          <Help id="close">
            <button onClick={s.clearNotice} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </Help>
        </div>
      )}
      {reset && (
        <div className="modal-backdrop" onClick={() => setReset(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Reset research lab"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>A fresh research question?</h2>
            <p>
              Reset this lab to $10,000. Your datasets, experiments and selected
              checkpoints will be erased from this browser.
            </p>
            <div className="modal-actions">
              <Button
                help="close"
                variant="secondary"
                onClick={() => setReset(false)}
              >
                Keep this lab
              </Button>
              <Button
                help="confirmReset"
                variant="danger"
                onClick={() => {
                  s.reset();
                  setReset(false);
                }}
              >
                Reset lab
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function TargetIcon() {
  return <ScanLine size={13} />;
}
function InfoIcon() {
  return <CircleHelp size={18} />;
}
