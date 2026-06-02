import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function readPackageJson() {
  return JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
}

async function readCiWorkflow() {
  return readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
}

test("package exposes the CLI contract without runtime dependencies", async () => {
  const packageJson = await readPackageJson();

  assert.equal(packageJson.name, "commandproof");
  assert.equal(packageJson.bin.commandproof, "bin/commandproof.js");
  assert.equal(packageJson.engines.node, ">=20");
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
});

test("package includes smoke and publish-readiness metadata", async () => {
  const packageJson = await readPackageJson();

  assert.equal(
    packageJson.scripts.smoke,
    "node bin/commandproof.js examples/README.md --dry-run --json",
  );
  assert.deepEqual(packageJson.files, [
    "bin/",
    "src/",
    "docs/",
    "examples/",
    "README.md",
    "LICENSE",
  ]);
});

test("CI workflow runs package verification commands", async () => {
  const workflow = await readCiWorkflow();

  assert.match(workflow, /^\s+- run: npm test$/m);
  assert.match(workflow, /^\s+- run: npm run lint$/m);
  assert.match(workflow, /^\s+- run: npm run smoke$/m);
});
