import { execFileSync } from "node:child_process";

const SECRET_PATTERNS = [
  { name: "MiniMax API key", pattern: /sk-cp-[A-Za-z0-9_-]{24,}/ },
  { name: "Groq API key", pattern: /gsk_[A-Za-z0-9]{24,}/ },
  { name: "Stripe live secret key", pattern: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: "Stripe test secret key", pattern: /sk_test_[A-Za-z0-9]{24,}/ },
  { name: "Stripe webhook secret", pattern: /whsec_[A-Za-z0-9]{24,}/ },
  { name: "OpenAI-style project key", pattern: /sk-proj-[A-Za-z0-9_-]{24,}/ },
];

const mode = process.argv.includes("--tracked") ? "tracked" : "staged";

function git(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    process.stderr.write(error.stderr?.toString() || error.message);
    process.exit(2);
  }
}

function scanText({ file, line, lineNumber, findings }) {
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(line)) {
      findings.push({ file, lineNumber, name });
    }
  }
}

function scanStagedAdditions() {
  const findings = [];
  let currentFile = "";
  const diff = git(["diff", "--cached", "--unified=0", "--", ":(exclude)package-lock.json"]);

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = match?.[2] || "";
      continue;
    }

    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    scanText({ file: currentFile, line, findings });
  }

  return findings;
}

function scanTrackedFiles() {
  const findings = [];
  const files = git(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .filter((file) => !file.endsWith("package-lock.json"))
    .filter((file) => !file.endsWith(".woff2"));

  for (const file of files) {
    let text = "";
    try {
      text = git(["show", `:${file}`]);
    } catch {
      continue;
    }

    text.split(/\r?\n/).forEach((line, index) => {
      scanText({ file, line, lineNumber: index + 1, findings });
    });
  }

  return findings;
}

const findings = mode === "tracked" ? scanTrackedFiles() : scanStagedAdditions();

if (findings.length > 0) {
  console.error(`Potential secrets found in ${mode === "tracked" ? "tracked files" : "staged additions"}:`);
  for (const finding of findings) {
    const location = [finding.file, finding.lineNumber].filter(Boolean).join(":");
    console.error(`- ${finding.name}${location ? ` in ${location}` : ""}`);
  }
  console.error("Remove the secret, rotate it if it was real, and commit only placeholders.");
  process.exit(1);
}

console.log(`No high-risk secret patterns found in ${mode === "tracked" ? "tracked files" : "staged additions"}.`);
