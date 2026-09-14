#!/usr/bin/env node
// Real execution layer for the local Ollama role bindings that
// docs/workflow/RRI_POLICY.md and AGENT_WORKFLOW_GUIDE.md declare but, until
// this script existed, never actually invoked: Low author/1st/2nd reviewer,
// and the optional Moderate/High architect reviewer. This talks to the local
// Ollama HTTP API (not the interactive `ollama run` CLI, whose ANSI spinner
// and inline "Thinking..." trace are not safe to parse as structured output).
import { pathToFileURL } from "node:url";

export const ROLES = Object.freeze({
  author: Object.freeze({ model: "devstral-small-2:24b-instruct-2512-q4_K_M" }),
  "first-reviewer": Object.freeze({ model: "gemma4:26b-a4b-it-qat" }),
  "second-reviewer": Object.freeze({ model: "qwen3.6:35b-a3b" }),
  architect: Object.freeze({ model: "gpt-oss:20b", num_ctx: 131072 }),
});

const REVIEW_ROLES = new Set(["first-reviewer", "second-reviewer", "architect"]);
const DEFAULT_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export function buildAuthorPrompt({ objective, touches = [], context = "", constraints = "" }) {
  if (!objective) throw new Error("author role requires --objective");
  const lines = [
    "You are a bounded local coding agent for the Pyjamada repository.",
    "Produce a minimal unified diff that satisfies the objective below.",
    "Only touch the listed paths. Do not invent files outside that list.",
    "Reply with the diff only, no prose before or after it.",
    "",
    `Objective: ${objective}`,
    `Allowed paths: ${touches.length ? touches.join(", ") : "(none given)"}`,
  ];
  if (constraints) lines.push(`Constraints: ${constraints}`);
  if (context) lines.push("", "Context:", context);
  return lines.join("\n");
}

export function buildReviewPrompt({ objective, diff, acceptance = "", invariants = "" }) {
  if (!diff) throw new Error("review roles require --diff or --diff-file");
  const lines = [
    "You are a fresh-context reviewer for the Pyjamada repository.",
    "Answer with a single verdict line, exactly one of:",
    "PASS: <one sentence>",
    "REVISE: <one sentence per required change>",
    "BLOCKED: <one sentence reason>",
  ];
  if (invariants) lines.push("", "Binding invariants to check:", invariants);
  if (objective) lines.push("", `Objective: ${objective}`);
  if (acceptance) lines.push(`Acceptance criteria: ${acceptance}`);
  lines.push("", "Diff:", "```diff", diff, "```");
  return lines.join("\n");
}

export function buildPrompt(role, input) {
  return REVIEW_ROLES.has(role) ? buildReviewPrompt(input) : buildAuthorPrompt(input);
}

export function parseVerdict(text) {
  const match = /^(PASS|REVISE|BLOCKED)\s*:?\s*(.*)$/ms.exec(text.trim());
  if (!match) return { verdict: "UNPARSED", reason: text.trim() };
  return { verdict: match[1], reason: match[2].trim() };
}

async function callOllama({ model, prompt, num_ctx, baseUrl }) {
  const options = num_ctx ? { num_ctx } : undefined;
  let response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, ...(options ? { options } : {}) }),
    });
  } catch (error) {
    throw new Error(
      `unavailable: could not reach Ollama at ${baseUrl} (${error.message}). ` +
        "Start the Ollama service before delegating; do not substitute a cloud model.",
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`unavailable: Ollama returned ${response.status} for model "${model}": ${body}`);
  }
  const data = await response.json();
  if (!data.done) throw new Error(`unavailable: Ollama did not complete generation for model "${model}"`);
  return data.response;
}

export async function runRole(role, input, { baseUrl = DEFAULT_BASE_URL, ollamaClient = callOllama } = {}) {
  const binding = ROLES[role];
  if (!binding) {
    throw new Error(`unknown role: ${role} (expected one of ${Object.keys(ROLES).join(", ")})`);
  }
  const prompt = buildPrompt(role, input);
  const raw = await ollamaClient({ model: binding.model, prompt, num_ctx: binding.num_ctx, baseUrl });
  if (REVIEW_ROLES.has(role)) {
    return { role, model: binding.model, ...parseVerdict(raw), raw };
  }
  return { role, model: binding.model, patch: raw.trim(), raw };
}

function usage() {
  return `Local Ollama role runner for Pyjamada's Low-band and architect-review bindings.

Usage:
  node scripts/local-agent.mjs --role author --objective "..." \\
    [--touches PATH ...] [--context TEXT] [--constraints TEXT]

  node scripts/local-agent.mjs --role first-reviewer|second-reviewer|architect \\
    --diff-file PATH [--objective "..."] [--acceptance TEXT] [--invariants TEXT]

Roles: ${Object.keys(ROLES).join(", ")}
Options: --json to print the full structured result instead of a summary.`;
}

export function parseArgs(argv) {
  const parsed = { touches: [], json: false };
  const valueOptions = new Set([
    "--role",
    "--objective",
    "--touches",
    "--context",
    "--constraints",
    "--diff",
    "--diff-file",
    "--acceptance",
    "--invariants",
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--json") {
      parsed.json = true;
      continue;
    }
    if (option === "--help" || option === "-h") {
      parsed.help = true;
      continue;
    }
    if (!valueOptions.has(option)) throw new Error(`unknown option: ${option}`);
    const value = argv[++index];
    if (value === undefined) throw new Error(`${option} requires a value`);
    if (option === "--touches") parsed.touches.push(value);
    else parsed[option.slice(2)] = value;
  }

  return parsed;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help || !args.role) {
    console.log(usage());
    return args.help ? 0 : 2;
  }

  let diff = args.diff;
  if (!diff && args["diff-file"]) {
    const fs = await import("node:fs/promises");
    diff = await fs.readFile(args["diff-file"], "utf8");
  }

  const result = await runRole(args.role, {
    objective: args.objective,
    touches: args.touches,
    context: args.context,
    constraints: args.constraints,
    diff,
    acceptance: args.acceptance,
    invariants: args.invariants,
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.patch !== undefined) {
    console.log(result.patch);
  } else {
    console.log(`${result.verdict}: ${result.reason}`);
  }
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`local-agent: ${error.message}`);
      process.exitCode = 2;
    });
}
