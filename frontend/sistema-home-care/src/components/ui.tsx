import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care-action";

export function Button({ variant = "primary", loading, className = "", children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" | "danger"; loading?: boolean }) {
  const variants = {
    primary: "bg-care-action text-white hover:bg-care-forest",
    secondary: "border border-care-line bg-white text-care-ink hover:bg-care-soft",
    quiet: "text-care-action hover:bg-care-soft",
    danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  };
  return <button {...props} disabled={disabled || loading} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${focus} ${variants[variant]} ${className}`}>{loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}{loading ? "Salvando…" : children}</button>;
}

export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`rounded-2xl border border-care-line bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0">{eyebrow && <p className="mb-1 text-xs font-semibold tracking-[0.12em] text-care-action uppercase">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight text-care-forest sm:text-3xl">{title}</h1>{description && <div className="mt-2 max-w-2xl text-sm leading-6 text-care-muted">{description}</div>}</div>{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "accent" }) {
  const tones = { neutral: "bg-care-soft text-care-forest", success: "bg-emerald-50 text-emerald-800", warning: "bg-amber-50 text-amber-800", accent: "bg-[#FBF2E8] text-[#83572D]" };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export const controlClass = `w-full rounded-xl border border-care-line bg-white px-3.5 py-2.5 text-sm text-care-ink shadow-sm transition placeholder:text-care-muted/75 hover:border-[#B9C9C0] focus:border-care-action focus:ring-2 focus:ring-care-action/15 disabled:bg-care-canvas disabled:text-care-muted ${focus}`;

export function FormControl(props: InputHTMLAttributes<HTMLInputElement> & { as?: "input" }): ReactElement;
export function FormControl(props: SelectHTMLAttributes<HTMLSelectElement> & { as: "select" }): ReactElement;
export function FormControl(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { as: "textarea" }): ReactElement;
export function FormControl({ as = "input", className = "", ...props }: (InputHTMLAttributes<HTMLInputElement> | SelectHTMLAttributes<HTMLSelectElement> | TextareaHTMLAttributes<HTMLTextAreaElement>) & { as?: "input" | "select" | "textarea"; className?: string }): ReactElement {
  const classes = `${controlClass} ${className}`;
  if (as === "select") return <select {...props as SelectHTMLAttributes<HTMLSelectElement>} className={classes} />;
  if (as === "textarea") return <textarea {...props as TextareaHTMLAttributes<HTMLTextAreaElement>} className={`${classes} min-h-24 resize-y`} />;
  return <input {...props as InputHTMLAttributes<HTMLInputElement>} className={classes} />;
}

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return <div role="status" className="flex items-center gap-3 rounded-2xl border border-care-line bg-white p-6 text-sm text-care-muted"><span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-care-action border-r-transparent" />{label}</div>;
}

export function ErrorState({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{children}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-care-line bg-white px-6 py-10 text-center"><h2 className="font-semibold text-care-forest">{title}</h2>{children && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-care-muted">{children}</p>}</div>;
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className={`inline-flex min-h-10 items-center justify-center rounded-xl border border-care-line bg-white px-4 py-2 text-sm font-semibold text-care-ink transition hover:bg-care-soft ${focus}`}>{children}</Link>;
}

export function Table({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className="overflow-x-auto rounded-2xl border border-care-line bg-white"><table className={`w-full border-collapse text-left text-sm ${className}`}>{children}</table></div>;
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-care-muted">{items.map((item, index) => {
    const current = index === items.length - 1;
    return <span key={`${item.label}-${index}`} className="flex items-center gap-2">{index > 0 && <span aria-hidden="true">/</span>}{item.to && !current ? <Link to={item.to} className="hover:text-care-action">{item.label}</Link> : <span aria-current={current ? "page" : undefined} className={current ? "text-care-ink" : undefined}>{item.label}</span>}</span>;
  })}</nav>;
}
