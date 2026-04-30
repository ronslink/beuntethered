import { execFileSync } from "node:child_process";

const SECRET_PATTERNS = [
  { name: "MiniMax API key", pattern: /sk-cp-[A-Za-z0-9_-]{24,}/ },
  { name: "Groq API key", pattern: /gsk_[A-Za-z0-9]{24,}/ },
  { name: "Stripe live secret key", pattern: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: "Stripe test secret key", pattern: /sk_test_[A-Za-z0-9]{24,}/ },
  { name: "Stripe webhook secret", pattern: /whsec_[A-Za-z0-9]{24,}/ },
  { name: "OpenAI-style project key", pattern: /sk-proj-[A-Za-z0-9_-]{24,}/ },
];

function stagedDiff() {
  try {
    return execFileSync("git", ["diff", "--cached", "--unified=0", "--", ":(exclude)package-lock.json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    process.stderr.write(error.stderr?.toString() || error.message);
    process.exit(2);
  }
}

const findings = [];
let currentFile = "";

for (const line of stagedDiff().split(/\r?\n/)) {
  if (line.startsWith("diff --git ")) {
    const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    currentFile = match?.[2] || "";
    continue;
  }

  if (!line.startsWith("+") || line.startsWith("+++")) continue;

  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(line)) {
      findings.push({ file: currentFile, name });
    }
  }
}

if (findings.length > 0) {
  console.error("Potential secrets found in staged additions:");
  for (const finding of findings) {
    console.error(`- ${finding.name}${finding.file ? ` in ${finding.file}` : ""}`);
  }
  console.error("Remove the secret, rotate it if it was real, and commit only placeholders.");
  process.exit(1);
}

console.log("No high-risk secret patterns found in staged additions.");
