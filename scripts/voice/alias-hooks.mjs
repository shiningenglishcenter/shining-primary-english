/**
 * Lets plain `node` scripts import app modules: "@/x" → src/x, and
 * extension-less TypeScript imports → .ts/.tsx. Used by scripts/voice.
 *   node --import ./scripts/voice/alias-hooks.mjs scripts/voice/texts.mts
 */
import { register } from "node:module";

register(
  `data:text/javascript,${encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const SRC = ${JSON.stringify(new URL("../../src/", import.meta.url).href)};
export async function resolve(specifier, context, next) {
  let spec = specifier.startsWith("@/") ? SRC + specifier.slice(2) : specifier;
  const local = spec.startsWith("file:") || spec.startsWith(".") ;
  if (local && !/\\.[cm]?[jt]sx?$/.test(spec)) {
    const base = new URL(spec, context.parentURL);
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      if (existsSync(fileURLToPath(base.href + ext))) return next(base.href + ext, context);
    }
  }
  return next(spec, context);
}
`)}`,
  import.meta.url,
);
