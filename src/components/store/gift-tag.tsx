/**
 * The signature element: a small gift-tag shape (notched edge + punched
 * hole). It has ONE meaning across the store: "this can be personalised".
 * Don't use it as decoration.
 */
export function GiftTag({ children, tone = "light", className = "" }: { children: React.ReactNode; tone?: "light" | "plum"; className?: string }) {
  const colours = tone === "plum" ? "bg-ribbon text-on-ribbon" : "bg-surface text-ink";
  return (
    <span
      className={`inline-flex items-center gap-2 py-1 pr-3 pl-4 text-xs leading-5 [clip-path:polygon(10px_0,100%_0,100%_100%,10px_100%,0_50%)] ${colours} ${className}`}
    >
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${tone === "plum" ? "bg-paper" : "bg-taupe"}`} />
      {children}
    </span>
  );
}
