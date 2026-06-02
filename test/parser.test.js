import assert from "node:assert/strict";
import { test } from "node:test";

import { parseMarkdownCommands } from "../src/parser.js";

test("parses shell fences and ignores non-shell fences", () => {
  const blocks = parseMarkdownCommands(`
# Demo

\`\`\`BASH
echo "hello"
\`\`\`

\`\`\`js
console.log("ignored")
\`\`\`

\`\`\`console
$ node --version
> npm --version
\`\`\`
`);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].language, "bash");
  assert.equal(blocks[0].script, 'echo "hello"');
  assert.equal(blocks[1].script, "node --version\nnpm --version");
});

test("skips commandproof-skip fences", () => {
  const blocks = parseMarkdownCommands(`
\`\`\`sh commandproof-skip
exit 1
\`\`\`

\`\`\`sh
echo ok
\`\`\`
`);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].script, "echo ok");
});
