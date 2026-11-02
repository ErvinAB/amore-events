import type { ComponentProps, ReactNode } from "react";

/** Label + control + hint + error, wired with ids for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  optionalLabel,
  children,
  className = "",
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optionalLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {optionalLabel ? <span className="font-normal text-ink-muted"> ({optionalLabel})</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

const control =
  "w-full rounded-control border bg-paper px-3.5 text-base text-ink placeholder:text-ink-muted/70 " +
  "border-line-strong hover:border-ink-muted focus-visible:border-ribbon " +
  "aria-[invalid=true]:border-error disabled:bg-tissue disabled:text-ink-muted";

export function TextInput({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${control} min-h-touch ${className}`} {...props} />;
}

export function TextArea({ className = "", rows = 4, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={`${control} py-3 leading-relaxed ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${control} min-h-touch pr-8 ${className}`} {...props} />;
}

export function Checkbox({ label, id, hint, ...props }: ComponentProps<"input"> & { label: ReactNode; id: string; hint?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-5 shrink-0 accent-ribbon"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      <div>
        <label htmlFor={id} className="text-base text-ink">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-sm text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  const cls = tone === "error" ? "border-error/30 bg-error-tint text-error" : "border-success/30 bg-success-tint text-success";
  return (
    <p role={tone === "error" ? "alert" : "status"} tabIndex={-1} className={`rounded-control border px-4 py-3 text-sm ${cls}`}>
      {children}
    </p>
  );
}
