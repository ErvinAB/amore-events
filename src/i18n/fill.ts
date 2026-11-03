/**
 * Tiny `{name}` interpolation, safe for client and server.
 * A value that already ends in "." (e.g. "3.000 ден.") absorbs a template
 * full stop right after it, so we never print "ден..".
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}(\.)?/g, (whole, k: string, dot?: string) => {
    if (!(k in values)) return whole;
    const v = String(values[k]);
    return dot && !v.endsWith(".") ? `${v}.` : v;
  });
}
