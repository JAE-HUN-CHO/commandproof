const DANGEROUS_PATTERNS = [
  { name: "sudo", pattern: /(^|\s)sudo(\s|$)/ },
  { name: "remove-root", pattern: /\brm\s+-(?:[^\n]*r[^\n]*f|[^\n]*f[^\n]*r)[^\n]*(?:\s|=)\/(?:\s|$)/ },
  { name: "curl-pipe-shell", pattern: /\bcurl\b[^\n|]*\|[^\n]*(?:sh|bash)\b/ },
  { name: "wget-pipe-shell", pattern: /\bwget\b[^\n|]*\|[^\n]*(?:sh|bash)\b/ },
  { name: "mkfs", pattern: /\bmkfs(?:\.|\s|$)/ },
  { name: "dd-output", pattern: /\bdd\b[^\n]*\bof=/ },
  { name: "chmod-root", pattern: /\bchmod\s+-R\s+777\s+\// },
];

export function findUnsafeCommand(script) {
  for (const { name, pattern } of DANGEROUS_PATTERNS) {
    if (pattern.test(script)) {
      return name;
    }
  }
  return null;
}
