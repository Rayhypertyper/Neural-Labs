import {
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { BookOpen, Check, ChevronRight, Info, Pin, X } from "lucide-react";
import { contextHints, explanations } from "../game/explanations";
import { useGame } from "../store/gameStore";
type HelpState = {
  pin: (key: string) => void;
  hover: (key: string, rect: DOMRect) => void;
  leave: () => void;
};
const Context = createContext<HelpState>({
  pin: () => {},
  hover: () => {},
  leave: () => {},
});
export function Help({
  id,
  children,
  className = "",
  as = "span",
}: {
  id: string;
  children: ReactNode;
  className?: string;
  as?: "span" | "div";
}) {
  const c = useContext(Context);
  const Tag = as;
  return (
    <Tag
      className={`help-target ${className}`}
      data-help={id}
      onMouseEnter={(e) => c.hover(id, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={c.leave}
      onFocus={(e) => c.hover(id, e.currentTarget.getBoundingClientRect())}
      onBlur={c.leave}
    >
      {children}
    </Tag>
  );
}
export function Explain({ id }: { id: string }) {
  const c = useContext(Context);
  return (
    <button
      type="button"
      className="info-button"
      aria-label={`Explain ${explanations[id]?.title ?? id}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        c.pin(id);
      }}
      data-help="pin"
    >
      <Info size={13} />
    </button>
  );
}
export function useInspector() {
  return useContext(Context);
}
export function EducationProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState("contract");
  const [hovered, setHovered] = useState<{
    key: string;
    x: number;
    y: number;
  } | null>(null);
  const [mobile, setMobile] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest(".quick-tooltip")) return;
      if (timer.current) clearTimeout(timer.current);
      if (hide.current) clearTimeout(hide.current);
      setHovered(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const pin = (key: string) => {
    setSelected(key);
    setHovered(null);
    if (window.innerWidth < 1200) setMobile(true);
  };
  const hover = (key: string, rect: DOMRect) => {
    if (hide.current) clearTimeout(hide.current);
    if (timer.current) clearTimeout(timer.current);
    if (window.matchMedia("(hover: none)").matches) return;
    timer.current = setTimeout(
      () =>
        setHovered({
          key,
          x: Math.min(window.innerWidth - 325, Math.max(12, rect.x + 10)),
          y: rect.bottom + 12,
        }),
      350,
    );
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    hide.current = setTimeout(() => setHovered(null), 180);
  };
  const e = hovered ? explanations[hovered.key] : null;
  return (
    <Context.Provider value={{ pin, hover, leave }}>
      {children}
      <aside className={`inspector ${mobile ? "mobile-open" : ""}`}>
        <Inspector
          selected={selected}
          close={() => setMobile(false)}
          onSelect={pin}
        />
      </aside>
      {e && hovered && (
        <div
          className="quick-tooltip"
          style={{
            left: hovered.x,
            top: Math.min(hovered.y, window.innerHeight - 240),
          }}
          role="tooltip"
          onMouseEnter={() => {
            if (hide.current) clearTimeout(hide.current);
          }}
          onMouseLeave={leave}
        >
          <div className="tooltip-title">
            <Info size={15} />
            <strong>{e.title}</strong>
          </div>
          <p>{e.purpose}</p>
          <div className="tooltip-tradeoff">
            <Check size={13} />
            {e.pros[0]}
          </div>
          <div className="tooltip-tradeoff muted">Tradeoff: {e.cons[0]}</div>
          <button onClick={() => pin(hovered.key)} data-help="pin">
            <Pin size={13} /> Pin full explanation <ChevronRight size={13} />
          </button>
        </div>
      )}
      <button
        className="mobile-help"
        data-help="pin"
        onClick={() => setMobile(true)}
        aria-label="Open educational inspector"
      >
        <BookOpen size={19} />
      </button>
    </Context.Provider>
  );
}
function Inspector({
  selected,
  close,
  onSelect,
}: {
  selected: string;
  close: () => void;
  onSelect: (s: string) => void;
}) {
  const s = useGame();
  const e = explanations[selected] ?? explanations.contract;
  const hints = contextHints(selected, s.experiments.at(-1), s.difficulty);
  return (
    <>
      <div className="inspector-heading">
        <span>
          <BookOpen size={16} /> LAB NOTES
        </span>
        <Help id="close">
          <button
            className="icon-button inspector-close"
            onClick={close}
            aria-label="Close inspector"
          >
            <X size={17} />
          </button>
        </Help>
        <span className="live-dot" />
      </div>
      <div className="inspector-body">
        <div className="note-symbol">
          <BookOpen size={22} />
        </div>
        <h2>{e.title}</h2>
        <p className="inspector-purpose">{e.purpose}</p>
        <div className="note-divider" />
        <h4>WHY CHOOSE IT</h4>
        {e.pros.map((x) => (
          <p className="note-list" key={x}>
            <Check size={14} />
            {x}
          </p>
        ))}
        <h4>THE TRADEOFFS</h4>
        {e.cons.map((x) => (
          <p className="note-list cons" key={x}>
            <span>−</span>
            {x}
          </p>
        ))}
        {e.bestWhen && (
          <>
            <h4>COMMONLY USEFUL WHEN</h4>
            {e.bestWhen.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </>
        )}
        <h4>WHAT IT AFFECTS</h4>
        <div className="effect-tags">
          {e.affects.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        {e.typicalRange && (
          <>
            <h4>TYPICAL RANGE</h4>
            <div className="typical-range">{e.typicalRange}</div>
          </>
        )}
        {hints.map((h, i) => (
          <div key={i} className={`context-hint ${h.severity}`}>
            <Info size={15} />
            <p>{h.message}</p>
          </div>
        ))}
        {e.advancedNotes && <p>{e.advancedNotes}</p>}
        <div className="inspector-tip">
          <Pin size={14} />
          <p>
            Hover to explore.
            <br />
            Click any <Info size={11} /> to keep learning here.
          </p>
        </div>
      </div>
      <div className="inspector-bottom">
        <span className="live-dot" /> Knowledge is your best upgrade.
      </div>
    </>
  );
}

// Keep native control structure intact while adding consistent educational access.
export function ControlHelp({
  id,
  children,
}: {
  id: string;
  children: ReactElement<any>;
}) {
  const c = useContext(Context);
  const props = children.props;
  return (
    <>
      {cloneElement(children, {
        "data-help": id,
        "aria-description": explanations[id]?.purpose,
        onMouseEnter: (event: any) => {
          props.onMouseEnter?.(event);
          c.hover(id, event.currentTarget.getBoundingClientRect());
        },
        onMouseLeave: (event: any) => {
          props.onMouseLeave?.(event);
          c.leave();
        },
        onFocus: (event: any) => {
          props.onFocus?.(event);
          c.hover(id, event.currentTarget.getBoundingClientRect());
        },
        onBlur: (event: any) => {
          props.onBlur?.(event);
          c.leave();
        },
      })}
      <Explain id={id} />
    </>
  );
}
