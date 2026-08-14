/**
 * Stable visual identity for a category.
 *
 * Shared by the categories grid and the actuals breakdown so a category keeps
 * one colour across screens — the point of a colour chip is that it can be
 * learned, which it cannot be if each screen assigns its own.
 *
 * The palette is the `--cat-*` band defined in globals.css: hues 195–330 only,
 * because emerald, rose and amber already mean favorable, unfavorable and
 * locked. A category tinted emerald would read as "under plan" before its name
 * was read.
 */

/** Text-on-tint, for a monogram sitting on its own 12% chip. */
const CHIP_TINTS = [
  "bg-cat-1/12 text-cat-1 ring-cat-1/25",
  "bg-cat-2/12 text-cat-2 ring-cat-2/25",
  "bg-cat-3/12 text-cat-3 ring-cat-3/25",
  "bg-cat-4/12 text-cat-4 ring-cat-4/25",
  "bg-cat-5/12 text-cat-5 ring-cat-5/25",
  "bg-cat-6/12 text-cat-6 ring-cat-6/25",
] as const;

/** Solid fill, for bars and dots. */
const SOLID_TINTS = [
  "bg-cat-1",
  "bg-cat-2",
  "bg-cat-3",
  "bg-cat-4",
  "bg-cat-5",
  "bg-cat-6",
] as const;

/**
 * Picks a slot from the id, not the name — renaming a category should not
 * repaint it, or the colour stops being a thing you can learn.
 */
function slotFor(id: string) {
  let hash = 0;
  // `for...of` walks code points, so a character outside the BMP arrives whole.
  // `charCodeAt` would read only its leading surrogate and collapse distinct
  // characters onto the same value; `codePointAt` reads what the loop handed us.
  for (const char of id) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  return hash % CHIP_TINTS.length;
}

export function categoryChip(id: string) {
  return CHIP_TINTS[slotFor(id)];
}

export function categorySolid(id: string) {
  return SOLID_TINTS[slotFor(id)];
}

/** "Marketing" → "M", "Cost of Goods" → "CG". */
export function categoryMonogram(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
