import type { LocalizedText } from "@/i18n/config";
import { TextArea, TextInput } from "@/components/ui/field";
import { adminT } from "@/messages/admin";

const langs = [
  { code: "en", label: adminT.common.english },
  { code: "mk", label: adminT.common.macedonian },
  { code: "sq", label: adminT.common.albanian },
] as const;

/**
 * One translatable field: English (required when `required`) plus optional
 * Macedonian and Albanian. Posts as `${name}.en`, `${name}.mk`, `${name}.sq`.
 */
export function LocalizedField({
  name,
  label,
  value,
  required = false,
  multiline = false,
  maxLength,
  hint,
  error,
  rows = 4,
  onEnglishChange,
}: {
  name: string;
  label: string;
  value?: Partial<LocalizedText> | null;
  required?: boolean;
  multiline?: boolean;
  maxLength: number;
  hint?: string;
  error?: string;
  rows?: number;
  onEnglishChange?: (v: string) => void;
}) {
  const errorId = `${name}-error`;
  return (
    <fieldset className="flex flex-col gap-3 rounded-control border border-line p-4">
      <legend className="px-1 text-sm font-medium">
        {label}
        {!required ? <span className="font-normal text-ink-muted"> ({adminT.common.optional})</span> : null}
      </legend>
      {hint ? <p className="-mt-1 text-sm text-ink-muted">{hint}</p> : null}
      {langs.map((l) => {
        const id = `${name}-${l.code}`;
        const v = value?.[l.code] ?? "";
        const missing = l.code !== "en" && !v && !!value?.en;
        const common = {
          id,
          name: `${name}.${l.code}`,
          defaultValue: v,
          maxLength,
          lang: l.code,
          required: required && l.code === "en",
          "aria-invalid": l.code === "en" && error ? true : undefined,
          "aria-describedby": l.code === "en" && error ? errorId : missing ? `${id}-missing` : undefined,
          onChange:
            l.code === "en" && onEnglishChange
              ? (e: { target: { value: string } }) => onEnglishChange(e.target.value)
              : undefined,
        };
        return (
          <div key={l.code} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm text-ink-muted">
              {l.label}
              {l.code === "en" && required ? ` (${adminT.common.required})` : ""}
            </label>
            {multiline ? <TextArea rows={rows} {...common} /> : <TextInput {...common} />}
            {missing ? (
              <p id={`${id}-missing`} className="text-xs text-warning">
                {adminT.common.translationMissing}
              </p>
            ) : null}
          </div>
        );
      })}
      {error ? (
        <p id={errorId} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
