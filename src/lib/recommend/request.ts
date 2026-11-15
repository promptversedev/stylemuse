/**
 * Checks the body of POST /api/partner/recommend. The caller is another server, but its input started as the output of an AI model, so it
 * is validated like anything else that comes from outside: shapes, ranges and sizes, and nothing is passed on that was not checked.
 *
 * Body:
 *   { "garment": { "category_family": "saree", "colors": [{ "name": "green", "rgb": [20, 110, 80], "percent": 70 }, ...] },
 *     "options": { "nearest": 3, "voters": 30, "minVoters": 20, "top": 5 } }          // options are optional
 */
import type { Colour } from "./colour";
import type { GarmentInput, Settings } from "./similar";

export const MAX_BODY_BYTES = 20_000;

export type Parsed = { ok: true; garment: GarmentInput; options: Partial<Settings> } | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function integerIn(v: unknown, min: number, max: number, name: string): number | string {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return `${name} must be a whole number from ${min} to ${max}`;
  return v;
}

export function parseRequest(body: unknown): Parsed {
  if (!isObject(body) || !isObject(body.garment)) return { ok: false, error: "Send { garment: { category_family, colors } }" };
  const g = body.garment;

  const family = typeof g.category_family === "string" ? g.category_family.trim().toLowerCase() : "";
  if (!/^[a-z][a-z -]{0,39}$/.test(family)) return { ok: false, error: "garment.category_family must be a short lower-case name such as \"saree\"" };

  if (!Array.isArray(g.colors) || g.colors.length < 1 || g.colors.length > 8) return { ok: false, error: "garment.colors must list 1 to 8 colours" };
  const colors: Colour[] = [];
  for (const [i, c] of g.colors.entries()) {
    if (!isObject(c) || !Array.isArray(c.rgb) || c.rgb.length !== 3 || !c.rgb.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      return { ok: false, error: `garment.colors[${i}].rgb must be three whole numbers from 0 to 255` };
    }
    if (c.percent !== undefined && (typeof c.percent !== "number" || !Number.isFinite(c.percent) || c.percent < 0 || c.percent > 100)) {
      return { ok: false, error: `garment.colors[${i}].percent must be a number from 0 to 100` };
    }
    if (c.name !== undefined && (typeof c.name !== "string" || c.name.length > 60)) return { ok: false, error: `garment.colors[${i}].name must be short text` };
    colors.push({ name: typeof c.name === "string" ? c.name.trim().toLowerCase() : "", rgb: c.rgb as [number, number, number], percent: c.percent as number | undefined });
  }

  const options: Partial<Settings> = {};
  if (body.options !== undefined) {
    if (!isObject(body.options)) return { ok: false, error: "options must be an object" };
    const limits: [keyof Pick<Settings, "nearest" | "voters" | "minVoters" | "top">, number, number][] = [
      ["nearest", 1, 10],        // the reference data keeps each photoshoot's 10 nearest
      ["voters", 5, 60],
      ["minVoters", 1, 60],
      ["top", 1, 10],
    ];
    for (const [key, min, max] of limits) {
      if (body.options[key] === undefined) continue;
      const v = integerIn(body.options[key], min, max, `options.${key}`);
      if (typeof v === "string") return { ok: false, error: v };
      options[key] = v;
    }
  }
  return { ok: true, garment: { category_family: family, colors }, options };
}
