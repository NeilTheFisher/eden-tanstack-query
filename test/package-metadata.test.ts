import { describe, expect, it } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

describe("package metadata", () => {
  it("declares elysia as a peer dependency", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(dir, "../package.json"), "utf-8")) as {
      peerDependencies?: Record<string, string>;
    };

    expect(pkg.peerDependencies?.elysia).toBe(">=1.0.0");
  });
});
