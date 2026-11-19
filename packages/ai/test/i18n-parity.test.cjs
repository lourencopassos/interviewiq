// Run with node --require tsx/cjs --test packages/ai/test/i18n-parity.test.cjs
// The web dictionaries are plain TS objects; tsx loads them directly.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const DICTIONARIES = path.resolve(__dirname, "../../../apps/web/lib/i18n/dictionaries");
const NAMESPACES = ["common", "nav", "landing", "setup", "interview", "report", "history", "errors"];
const LOCALES = ["pt", "es"];

/**
 * Strings that are legitimately the same in English and the other locales:
 * product/technical terms the UI keeps in English. Compared case-insensitively.
 * Keep this short; anything else identical to English is probably untranslated.
 */
const SAME_AS_ENGLISH_ALLOWLIST = new Set([
  "system design", // interview type / stage name, kept in English in pt-BR
  "claude · whisper · elevenlabs", // landing hero fact: provider names
  "en · pt-br · es", // landing hero fact: language codes
]);

function load(locale, ns) {
  const mod = require(path.join(DICTIONARIES, locale, ns));
  assert.ok(mod[ns], `${locale}/${ns}.ts must export \`${ns}\``);
  return mod[ns];
}

/** Flatten to { "a.b.0.c": leaf } so key paths (including array lengths) can be compared. */
function flatten(value, prefix = "", out = {}) {
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out[prefix] = value;
  }
  return out;
}

/** Placeholders such as {count} or {digest} that the UI interpolates. */
const placeholders = (s) => (typeof s === "string" ? (s.match(/\{\w+\}/g) ?? []).sort() : []);

for (const ns of NAMESPACES) {
  const en = flatten(load("en", ns));

  for (const locale of LOCALES) {
    const other = flatten(load(locale, ns));

    test(`${locale}/${ns} has exactly the English key paths`, () => {
      const missing = Object.keys(en).filter((k) => !(k in other));
      const extra = Object.keys(other).filter((k) => !(k in en));
      assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
    });

    test(`${locale}/${ns} leaves have the English types and placeholders`, () => {
      const mismatched = Object.keys(en)
        .filter((k) => k in other)
        .filter((k) => typeof en[k] !== typeof other[k] || placeholders(en[k]).join() !== placeholders(other[k]).join())
        .map((k) => `${k}: ${JSON.stringify(en[k])} vs ${JSON.stringify(other[k])}`);
      assert.deepEqual(mismatched, []);
    });

    test(`${locale}/${ns} has no untranslated sentences`, () => {
      const untranslated = Object.keys(en)
        .filter((k) => typeof en[k] === "string" && en[k] === other[k])
        .filter((k) => en[k].length > 12 && en[k].includes(" "))
        .filter((k) => !SAME_AS_ENGLISH_ALLOWLIST.has(en[k].toLowerCase()))
        .map((k) => `${k}: ${JSON.stringify(en[k])}`);
      assert.deepEqual(untranslated, []);
    });
  }
}
