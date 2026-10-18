import { Children, isValidElement, type ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, Lock } from "lucide-react";
import { Explain, Help } from "./Help";
import { explanations } from "../game/explanations";
function containsText(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      (typeof child === "string" && child.trim().length > 0) ||
      typeof child === "number" ||
      (isValidElement<{ children?: ReactNode }>(child) &&
        containsText(child.props.children)),
  );
}
export function Button({
  help,
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
  type = "button",
}: {
  help: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <Help id={help}>
      <button
        type={type}
        aria-label={
          containsText(children) ? undefined : explanations[help]?.title
        }
        className={`button ${variant} ${className}`}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
    </Help>
  );
}
export function Field({
  label,
  help,
  children,
  detail,
}: {
  label: string;
  help: string;
  children: ReactNode;
  detail?: string;
}) {
  return (
    <Help id={help} as="div" className="field">
      <div className="field-heading">
        <label>{label}</label>
        <Explain id={help} />
      </div>
      {children}
      {detail && <small>{detail}</small>}
    </Help>
  );
}
export function Select({
  help,
  value,
  onChange,
  options,
  disabled = false,
}: {
  help: string;
  value: string | number;
  onChange: (s: string) => void;
  options: (string | number)[];
  disabled?: boolean;
}) {
  const base = help.startsWith("optimizer.")
    ? "optimizer"
    : help.startsWith("batch.")
      ? "batch"
      : help.startsWith("schedule.")
        ? "schedule"
        : help.startsWith("loss.")
          ? "loss"
          : help;
  const key = explanations[`${base}.${value}`] ? `${base}.${value}` : help;
  return (
    <Help id={key} as="div" className="select-wrap">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={
          explanations[base === "schedule" ? "scheduler" : base]?.title ??
          explanations[help]?.title ??
          base
        }
      >
        {options.map((o) => (
          <option
            value={o}
            key={o}
            title={explanations[`${base}.${o}`]?.purpose}
          >
            {o}
          </option>
        ))}
      </select>
      <Explain id={key} />
    </Help>
  );
}
export function Toggle({
  help,
  checked,
  onChange,
  disabled = false,
  label,
}: {
  help: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Help id={help}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle ${checked ? "on" : ""}`}
        disabled={disabled}
        onClick={onChange}
      >
        <span />
      </button>
    </Help>
  );
}
export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function StageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="stage-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  icon,
  heading,
  body,
  button,
}: {
  icon: ReactNode;
  heading: string;
  body: string;
  button: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div>{icon}</div>
      <h2>{heading}</h2>
      <p>{body}</p>
      {button}
    </div>
  );
}
export function Status({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`status ${done ? "ready" : ""}`}>
      {done ? <Check size={12} /> : <span className="status-dot" />}
      {label}
    </span>
  );
}
export { ArrowRight, Check, ChevronRight, Lock };
