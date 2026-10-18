import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Cpu,
  Database,
  FlaskConical,
  Grid2X2,
  Layers3,
  Menu,
  MessageSquare,
  Rocket,
  RotateCcw,
  ScanLine,
  Wallet,
  X,
} from "lucide-react";
import { useResearch, selectedModel } from "../store/researchStore";
import type { ResearchPage, ResearchProject } from "../types/research";
import {
  CAPABILITY_LABELS,
  STAGES,
  billions,
  contractFor,
  params,
} from "../game/researchCatalog";
import { projectLLM } from "../game/llmSimulation";
import { money } from "../game/catalog";
import { Explain, useInspector } from "./Help";
import { Button, StageHeading } from "./ui";
import { Facts } from "./ResearchFields";
import {
  ArchitecturePage,
  ComputePage,
  CorpusPage,
  LLMTrainingDock,
} from "./ResearchPreparation";
import {
  EvaluationPage,
  PostTrainingPage,
  ProductionPage,
  ServingPage,
} from "./ResearchRelease";

const NAV = [
  { id: "overview", label: "Research overview", icon: Grid2X2 },
  { id: "corpus", label: "Corpus & tokenizer", icon: Database },
  { id: "architecture", label: "Transformer design", icon: Layers3 },
  { id: "compute", label: "Pretraining room", icon: Cpu },
  { id: "post", label: "Post-training", icon: MessageSquare },
  { id: "evaluation", label: "Evaluations", icon: ScanLine },
  { id: "serving", label: "Optimize & deploy", icon: Rocket },
  { id: "production", label: "Production", icon: Activity },
] as const;
export default function ResearchLab() {
  const s = useResearch(),
    p = s.projects[s.active]!,
    c = contractFor(s.active),
    inspector = useInspector();
  const [menu, setMenu] = useState(false),
    [reset, setReset] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const menuClose = useRef<HTMLButtonElement>(null);
  const previousMenu = useRef(false);
  useEffect(() => {
    if (menu) menuClose.current?.focus();
    else if (previousMenu.current) menuToggle.current?.focus();
    previousMenu.current = menu;
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  const cp = selectedModel(p);
  useEffect(() => {
    if (!s.notice) return;
    const id = setTimeout(s.dismiss, 9000);
    return () => clearTimeout(id);
  }, [s.notice]);
  const navigate = (page: ResearchPage) => {
    s.page(page);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <div className="app-shell research-shell">
      <aside
        id="llm-sidebar"
        className={`sidebar research-sidebar ${menu ? "open" : ""}`}
      >
        <button
          ref={menuClose}
          className="research-menu-close"
          onClick={() => setMenu(false)}
          aria-label="Close research navigation"
        >
          <X size={19} />
        </button>
        <button className="brand research-wordmark" onClick={s.showBoard}>
          <FlaskConical size={25} />
          neural<span>labs</span>
        </button>
        <button className="research-back" onClick={s.showBoard}>
          <ArrowLeft size={14} />
          All contracts
          <ChevronRight size={13} />
        </button>
        <nav aria-label="LLM research pipeline">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${p.page === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
              aria-current={p.page === n.id ? "page" : undefined}
            >
              <n.icon size={17} />
              <span>{n.label}</span>
              {n.id === "compute" && p.running && <span className="live-dot" />}
              {n.id === "production" && p.deployed && <Check size={14} />}
            </button>
          ))}
        </nav>
        <section className="sidebar-contract">
          <div>
            <span className="live-dot" />
            {p.deployed ? "LIVE RELEASE" : "ACTIVE RESEARCH"}
          </div>
          <h3>{c.title}</h3>
          <p>{c.client}</p>
          <div className="mini-objective">
            <span>Model version</span>
            <strong>v{p.version}</strong>
          </div>
          <div className="contract-progress">
            <i
              style={{
                width: `${Math.min(100, ((cp?.scores[c.metric] ?? 0) / c.target) * 100)}%`,
              }}
            />
          </div>
          <span className="contract-progress-label">
            {cp
              ? `${cp.scores[c.metric].toFixed(1)}% selected · ${c.target}% target`
              : "Your first checkpoint awaits"}
          </span>
        </section>
        <div className="sidebar-bottom">
          <button
            className="sidebar-help"
            onClick={() => inspector.pin("llm.lifecycle")}
          >
            <BookOpen size={17} />
            LLM field guide
            <ChevronRight size={14} />
          </button>
          <div className="sidebar-footer">
            <span>
              NEURAL LABS <b>v2.0</b>
            </span>
            <button
              onClick={() => setReset(!reset)}
              aria-label="Restart this contract"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <div className="mobile-nav-scrim" onClick={() => setMenu(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMenu(!menu)}
              aria-label="Toggle navigation"
              ref={menuToggle}
              aria-controls="llm-sidebar"
              aria-expanded={menu}
            >
              <Menu size={20} />
            </button>
            <span>Model v{p.version}</span>
            <ChevronRight size={13} />
            <strong>{NAV.find((n) => n.id === p.page)?.label}</strong>
          </div>
          <div className="topbar-budget">
            <Wallet size={16} />
            <span>{money(p.budget)}</span>
            <small>remaining</small>
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="workspace research-workspace"
        >
          {reset && (
            <div className="research-issues">
              <strong>Restart {c.title}?</strong>
              <p>
                This clears this contract’s datasets, runs, and versions. Other
                contracts are preserved.
              </p>
              <div className="research-actions">
                <Button
                  help="llm.contracts"
                  variant="danger"
                  onClick={() => {
                    s.resetProject();
                    setReset(false);
                  }}
                >
                  Restart this contract
                </Button>
                <Button
                  help="close"
                  variant="secondary"
                  onClick={() => setReset(false)}
                >
                  Keep my research
                </Button>
              </div>
            </div>
          )}
          {p.deployed && p.page !== "production" && (
            <div className="research-live-banner">
              <Check size={16} />
              Model v{p.version} is serving simulated traffic.
              <Button
                help="llm.feedback"
                variant="quiet"
                onClick={() => navigate("production")}
              >
                View production
                <ArrowRight size={14} />
              </Button>
            </div>
          )}
          {p.page === "overview" ? (
            <ResearchOverview project={p} />
          ) : p.page === "corpus" ? (
            <CorpusPage project={p} />
          ) : p.page === "architecture" ? (
            <ArchitecturePage project={p} />
          ) : p.page === "compute" ? (
            <ComputePage project={p} />
          ) : p.page === "post" ? (
            <PostTrainingPage project={p} />
          ) : p.page === "evaluation" ? (
            <EvaluationPage project={p} />
          ) : p.page === "serving" ? (
            <ServingPage project={p} />
          ) : (
            <ProductionPage project={p} />
          )}
          <footer className="research-footer">
            All metrics are educational simulations. No real model is trained.
            <button onClick={() => inspector.pin("llm.lifecycle")}>
              How this lab works
            </button>
          </footer>
        </main>
      </div>
      <LLMTrainingDock project={p} />
      {s.notice && (
        <div className="toast research-toast" role="status">
          <FlaskConical size={18} />
          <span>{s.notice}</span>
          <button
            onClick={s.dismiss}
            aria-label="Dismiss research notification"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
function ResearchOverview({ project: p }: { project: ResearchProject }) {
  const s = useResearch(),
    c = contractFor(p.contract),
    e = projectLLM(p.config, p.contract),
    cp = selectedModel(p);
  const go = (page: ResearchPage, key?: string) => {
    s.page(page);
    if (key)
      requestAnimationFrame(() =>
        document
          .getElementById(`research-${key}`)
          ?.scrollIntoView({ block: "start" }),
      );
    else window.scrollTo({ top: 0, behavior: "instant" });
  };
  const completed = (key: string) =>
    key === "acquire"
      ? p.config.data.acquired.length > 0
      : key === "pretraining"
        ? p.runs.some((r) => r.status === "completed")
        : key === "checkpoints"
          ? !!cp
          : key === "hidden"
            ? !!p.report?.passed
            : key === "deploy"
              ? p.deployed
              : key === "monitoring"
                ? p.days.length > 0
                : key === "feedback"
                  ? p.version > 1
                  : p.actions.some((a) => a.type === key);
  return (
    <>
      <StageHeading
        title="From a corpus to a conversation."
        description="The entire model lifecycle. One research decision at a time."
        action={<span className="research-version">Model v{p.version}</span>}
      />
      <section className="research-mission">
        <div>
          <span className="research-client">{c.client}</span>
          <h2>{c.description}</h2>
          <p>{c.lesson}</p>
          <div className="research-actions">
            <Button
              help="llm.lifecycle"
              onClick={() =>
                go(
                  p.config.data.acquired.length
                    ? p.runs.length
                      ? "evaluation"
                      : "compute"
                    : "corpus",
                )
              }
            >
              {p.runs.length
                ? "Explore your checkpoints"
                : p.config.data.acquired.length
                  ? "Open pretraining room"
                  : "Begin with the corpus"}
              <ArrowRight size={16} />
            </Button>
            <span>{money(c.reward)} contract payout</span>
          </div>
        </div>
        <div className="research-mission-objective">
          <FlaskConical size={34} />
          <strong>{c.target}%</strong>
          <span>{CAPABILITY_LABELS[c.metric]}</span>
          <small>hidden evaluation target</small>
        </div>
      </section>
      <Facts
        items={[
          {
            label: "Model capacity",
            value: params(e.parameters),
            note: `${params(e.activeParameters)} active/token`,
          },
          {
            label: "Pretraining budget",
            value: billions(p.config.training.tokens),
            note: `${e.gpus} training GPU${e.gpus > 1 ? "s" : ""}`,
          },
          {
            label: "Saved checkpoints",
            value: p.checkpoints.length,
            note: cp ? `Selected: ${cp.phase}` : "Select one after training",
          },
        ]}
      />
      <div className="research-map-heading">
        <h2>
          Your model’s journey <Explain id="llm.lifecycle" />
        </h2>
        <p>
          28 stages, from the first document to the next generation.
          Post-training stages are optional unless your contract requires them.
        </p>
      </div>
      <div className="lifecycle-map">
        {STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => go(stage.page, stage.key)}
            className={completed(stage.key) ? "done" : ""}
          >
            <span className="lifecycle-number">
              {completed(stage.key) ? (
                <Check size={14} />
              ) : (
                String(stage.number).padStart(2, "0")
              )}
            </span>
            <span>{stage.title}</span>
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      {p.runs.length > 0 && (
        <div className="research-notebook">
          <h2>Research notebook</h2>
          {p.runs.map((run) => (
            <div key={run.id}>
              <FlaskConical size={16} />
              <strong>Pretraining #{run.id}</strong>
              <span>
                {params(run.estimate.parameters)} ·{" "}
                {billions((run.config.training.tokens * run.cursor) / 40)} seen
                · {run.status}
              </span>
              <b>{money(run.charged)}</b>
            </div>
          ))}
          {p.actions.map((action) => (
            <div key={action.id}>
              <Check size={15} />
              <strong>{action.type}</strong>
              <span>{action.detail}</span>
              <b>{money(action.cost)}</b>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
