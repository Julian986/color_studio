type LineKind = "divider" | "spacer" | "hero" | "section" | "highlight" | "check" | "bullet" | "body";

const HERO_PREFIX = /^✨\s+/u;
const SECTION_PREFIX =
  /^[💎🚀🧠🧪🎓💼🔥⚡🔬🎯👁️🌿🔴💁‍♀️⚠️]/u;
const HIGHLIGHT_PREFIX = /^[🟢🔵🔴🥥🌰💪]/u;
const CHECK_PREFIX = /^✔/u;
const BULLET_PREFIX = /^[*•]\s/u;

function firstContentLineIndex(lines: string[]): number {
  return lines.findIndex((l) => l.trim() && l !== "⸻");
}

function classifyLine(line: string, index: number, lines: string[]): LineKind {
  if (line === "⸻") return "divider";
  if (!line.trim()) return "spacer";

  const firstIdx = firstContentLineIndex(lines);
  if (index === firstIdx && HERO_PREFIX.test(line)) return "hero";
  if (HERO_PREFIX.test(line) && index > firstIdx) return "section";
  if (SECTION_PREFIX.test(line)) return "section";
  if (CHECK_PREFIX.test(line)) return "check";
  if (BULLET_PREFIX.test(line)) return "bullet";
  if (HIGHLIGHT_PREFIX.test(line)) return "highlight";

  return "body";
}

const lineClass: Record<Exclude<LineKind, "divider" | "spacer">, string> = {
  hero: "font-heading text-[26px] leading-[1.15] tracking-[0.01em] text-white sm:text-[28px]",
  section: "mt-1 font-heading text-[18px] leading-[1.25] text-white first:mt-0",
  highlight: "text-[14px] leading-[1.5] text-white/95",
  check: "text-[14px] leading-[1.5] text-white/90",
  bullet:
    "border-l-2 border-[var(--premium-gold)]/35 pl-3.5 text-[14px] leading-[1.5] text-[var(--soft-gray)]/92",
  body: "text-[14px] leading-[1.6] text-[var(--soft-gray)]/88",
};

/** Renderiza el texto de Yoe línea por línea, sin alterar el contenido. */
export function YoeGuideBody({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <article className="space-y-0">
      {lines.map((line, index) => {
        const kind = classifyLine(line, index, lines);

        if (kind === "divider") {
          return (
            <hr
              key={index}
              className="my-6 border-0 border-t border-[var(--premium-gold)]/15"
            />
          );
        }
        if (kind === "spacer") {
          return <div key={index} className="h-3.5" aria-hidden />;
        }

        return (
          <p key={index} className={lineClass[kind]}>
            {line}
          </p>
        );
      })}
    </article>
  );
}
