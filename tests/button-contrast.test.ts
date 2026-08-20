import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalStyles = readFileSync("app/globals.css", "utf8");

test("navy buttons retain white labels in every interactive state", () => {
  for (const state of ["hover", "active", "focus-visible", "disabled"]) {
    assert.ok(
      globalStyles.includes(
        `[class~="bg-[color:var(--navy)]"]:${state}`,
      ),
      `direct navy controls should explicitly preserve white text on ${state}`,
    );
  }

  assert.match(
    globalStyles,
    /\.btn\.btn-primary:focus-visible,[\s\S]*?\.btn\.btn-primary\[disabled\][\s\S]*?color:\s*#ffffff/,
  );
});
