import { useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlaskConical,
  Lock,
  Sparkles,
} from "lucide-react";
import { CONTRACTS, CAPABILITY_LABELS } from "../game/researchCatalog";
import { useResearch } from "../store/researchStore";
import { useGame } from "../store/gameStore";
import { money } from "../game/catalog";
import { Button } from "./ui";
import { Explain } from "./Help";

export default function ContractBoard() {
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" }), []);
  const s = useResearch(),
    vision = useGame();
  return (
    <div className="contract-board">
      <header>
        <button className="research-wordmark" onClick={s.closeBoard}>
          <FlaskConical size={22} />
          neural<span>labs</span>
        </button>
        <Button help="llm.contracts" variant="secondary" onClick={s.closeBoard}>
          <ArrowLeft size={15} />
          Return to workspace
        </Button>
      </header>
      <main id="main-content" tabIndex={-1}>
        <div className="board-intro">
          <div>
            <h1>A whole lab of possibilities.</h1>
            <p>
              Start with two species. Work your way to a model with a million
              users.
              <br />
              Every contract is a new research question—and a notebook of your
              own.
            </p>
          </div>
          <label>
            Research access <Explain id="llm.contracts" />
            <select
              aria-label="Research access"
              value={s.mode}
              onChange={(e) => s.setMode(e.target.value as typeof s.mode)}
            >
              <option>Open research</option>
              <option>Career</option>
            </select>
          </label>
        </div>
        <div className="board-mode">
          <Sparkles size={16} />
          {s.mode === "Open research"
            ? "All six contracts are open. Follow your curiosity."
            : "Complete each contract to unlock the next research challenge."}
          <span>Browser-local simulation</span>
        </div>
        <div className="contract-list">
          {CONTRACTS.map((c, index) => {
            const locked =
              s.mode === "Career" &&
              index > 0 &&
              !s.completed.includes(CONTRACTS[index - 1].id);
            const complete = s.completed.includes(c.id),
              p = s.projects[c.id];
            const started =
              c.id === "cats"
                ? vision.dataset.samples > 0
                : c.id === "digits"
                  ? false
                  : !!p;
            return (
              <article
                className={`research-contract ${complete ? "complete" : ""}`}
                key={c.id}
              >
                <div className="contract-index">
                  {complete ? (
                    <Check size={22} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </div>
                <div className="contract-subject">
                  <div className="contract-client">
                    {c.client}
                    <span>{c.size}</span>
                  </div>
                  <h2>{c.title}</h2>
                  <p>{c.lesson}</p>
                  <span className="contract-learning">{c.description}</span>
                </div>
                <div className="contract-terms">
                  <strong>{money(c.budget)}</strong>
                  <span>research budget</span>
                  <small>
                    {c.id === "cats" || c.id === "digits"
                      ? `${c.target}% hidden accuracy`
                      : `${c.target}% ${CAPABILITY_LABELS[c.metric].split(" · ").at(-1)}`}
                  </small>
                </div>
                <Button
                  help="llm.contracts"
                  variant={s.active === c.id ? "primary" : "secondary"}
                  disabled={locked}
                  onClick={() => s.selectContract(c.id)}
                >
                  {locked ? (
                    <>
                      <Lock size={14} />
                      Locked
                    </>
                  ) : (
                    <>
                      {complete
                        ? "Revisit lab"
                        : started
                          ? "Continue"
                          : "Open contract"}
                      <ArrowRight size={15} />
                    </>
                  )}
                </Button>
              </article>
            );
          })}
        </div>
        <p className="board-footnote">
          Progress saves automatically in this browser. Training, benchmarks,
          cloud prices, and production traffic are simulated.
        </p>
      </main>
    </div>
  );
}
