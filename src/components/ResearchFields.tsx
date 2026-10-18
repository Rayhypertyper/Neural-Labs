import { useId } from "react";
import type { ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useResearch, selectedModel } from "../store/researchStore";
import type { LLMConfig, ResearchProject, Treatment } from "../types/research";
import { RESEARCH_FIELDS } from "../game/researchEducation";
import { STAGES } from "../game/researchCatalog";
import { treatmentCost } from "../game/llmSimulation";
import { Explain, Help } from "./Help";
import { Button } from "./ui";
import { money } from "../game/catalog";

export function ConfigFields({
  project: p,
  group,
  names,
}: {
  project: ResearchProject;
  group: keyof LLMConfig;
  names?: string[];
}) {
  const s = useResearch(),
    prefix = useId();
  const specs = RESEARCH_FIELDS[group] ?? {};
  const values = p.config[group] as unknown as Record<string, unknown>;
  const disabled = !!p.running || (p.deployed && group !== "production");
  return (
    <div className="research-fields">
      {(names ?? Object.keys(specs)).map((key) => {
        const spec = specs[key];
        if (!spec) return null;
        const help = `llm.${group}.${key}`,
          id = `${prefix}-${key}`,
          value = values[key];
        const setValue = (next: unknown) => s.configure(group, { [key]: next });
        return (
          <Help
            key={key}
            id={help}
            as="div"
            className={`research-field ${spec.type === "boolean" ? "research-switch-field" : ""}`}
          >
            <div className="research-field-label">
              <label htmlFor={id}>
                {spec.label}
                {spec.unit && <small>{spec.unit}</small>}
              </label>
              <Explain id={spec.options ? `${help}.${value}` : help} />
            </div>
            {spec.type === "boolean" ? (
              <input
                id={id}
                type="checkbox"
                checked={!!value}
                disabled={disabled}
                onChange={(e) => setValue(e.target.checked)}
              />
            ) : spec.options ? (
              <select
                id={id}
                value={String(value)}
                disabled={disabled}
                onChange={(e) =>
                  setValue(
                    typeof value === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                  )
                }
              >
                {spec.options.map((option) => (
                  <option key={option} value={option}>
                    {typeof option === "number" && option >= 1000
                      ? option.toLocaleString()
                      : option}
                  </option>
                ))}
              </select>
            ) : spec.type === "text" ? (
              <input
                id={id}
                type="text"
                value={String(value)}
                disabled={disabled}
                maxLength={150}
                onChange={(e) => setValue(e.target.value)}
              />
            ) : (
              <input
                id={id}
                type="number"
                value={Number(value)}
                min={spec.min}
                max={spec.max}
                step={spec.step}
                disabled={disabled}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  if (Number.isFinite(n))
                    setValue(
                      Math.max(
                        spec.min ?? 0,
                        Math.min(spec.max ?? Infinity, n),
                      ),
                    );
                }}
              />
            )}
          </Help>
        );
      })}
    </div>
  );
}
export function ResearchSection({
  stage,
  children,
  description,
  action,
}: {
  stage: string;
  children: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  const step = STAGES.find((s) => s.key === stage)!;
  return (
    <section className="research-section" id={`research-${stage}`}>
      <div className="research-section-heading">
        <div>
          <h2>
            <span>{String(step.number).padStart(2, "0")}</span>
            {step.title}
            <Explain id={`llm.stage.${stage}`} />
          </h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Facts({
  items,
}: {
  items: { label: string; value: ReactNode; note?: string }[];
}) {
  return (
    <dl className="research-facts">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </dl>
  );
}
export function Issues({
  issues,
  warnings = [],
}: {
  issues: string[];
  warnings?: string[];
}) {
  return (
    <>
      {issues.length > 0 && (
        <div className="research-issues" role="status">
          <strong>Resolve before continuing</strong>
          <ul>
            {issues.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="research-warnings">
          <strong>Research notes</strong>
          <ul>
            {warnings.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
export function TreatmentButton({
  project: p,
  type,
  label,
}: {
  project: ResearchProject;
  type: Treatment;
  label: string;
}) {
  const s = useResearch(),
    cp = selectedModel(p),
    cost = cp ? treatmentCost(type, p.config, cp, p.contract) : 0;
  const done = cp?.treatments.includes(type),
    disabled = !!p.running || p.deployed || !cp || done || cost > p.budget;
  return (
    <div className="research-stage-action">
      <Button
        help="llm.checkpoints"
        disabled={disabled}
        onClick={() => s.treatment(type)}
      >
        {done ? (
          <>
            <Check size={15} />
            In selected lineage
          </>
        ) : (
          <>
            {label}
            <ChevronRight size={15} />
          </>
        )}
      </Button>
      <span>
        {cp
          ? `${money(cost)} ${done ? "configuration estimate" : "estimated cost"}`
          : "Select a checkpoint in Evaluations first"}
      </span>
    </div>
  );
}
