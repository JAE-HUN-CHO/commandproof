const SHELL_LANGUAGES = new Set(["sh", "bash", "zsh", "shell", "console", "terminal"]);

function normalizeConsoleScript(script) {
  return script
    .split("\n")
    .filter((line) => /^\s*[$>]\s?/.test(line))
    .map((line) => line.replace(/^\s*[$>]\s?/, ""))
    .join("\n")
    .trim();
}

function parseFenceInfo(info = "") {
  const trimmed = info.trim();
  if (!trimmed) return null;

  const [rawLanguage, ...rawRest] = trimmed.split(/\s+/);
  const language = rawLanguage.toLowerCase();
  const rest = rawRest.map((item) => item.toLowerCase());
  if (
    rest.includes("commandproof-skip")
    || rest.includes("cp-skip")
    || language === "commandproof-skip"
    || language === "cp-skip"
  ) {
    return { skip: true };
  }

  if (!SHELL_LANGUAGES.has(language)) return null;
  return { language };
}

export function parseMarkdownCommands(markdown) {
  const blocks = [];
  const lines = String(markdown).split(/\r?\n/);
  let cursor = 0;

  while (cursor < lines.length) {
    const opening = lines[cursor].match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (!opening) {
      cursor += 1;
      continue;
    }

    const fenceChar = opening[1][0];
    const fenceLength = opening[1].length;
    const parsed = parseFenceInfo(opening[2] ?? "");
    const lineStart = cursor + 1;
    cursor += 1;

    const body = [];
    while (cursor < lines.length) {
      const closing = lines[cursor].match(new RegExp(`^\\s*\\${fenceChar}{${fenceLength},}\\s*$`));
      if (closing) break;
      body.push(lines[cursor]);
      cursor += 1;
    }

    if (cursor >= lines.length) break;

    if (parsed?.language && !parsed.skip) {
      const script = ["console", "terminal"].includes(parsed.language)
        ? normalizeConsoleScript(body.join("\n"))
        : body.join("\n").trim();

      if (script) {
        blocks.push({
          index: blocks.length + 1,
          language: parsed.language,
          lineStart,
          script,
        });
      }
    }

    cursor += 1;
  }

  return blocks;
}
