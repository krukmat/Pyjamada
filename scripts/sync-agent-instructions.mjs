#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const STARTUP_SOURCES = Object.freeze([
  "AGENTS.md",
  "docs/workflow/AGENT_WORKFLOW_GUIDE.md",
  "docs/workflow/HITL_AUTONOMY_POLICY.md",
  "docs/workflow/RRI_POLICY.md",
  "docs/workflow/TASK_CARD_TEMPLATE.md",
]);

export const CODEX_OUTPUT = "AGENTS.override.md";
export const CLAUDE_OUTPUT = "CLAUDE.md";
export const MAX_CODEX_BYTES = 30 * 1024;

export const CLAUDE_BLOCK_START = "<!-- BEGIN GENERATED STARTUP IMPORTS: npm run agent:sync -->";
export const CLAUDE_BLOCK_END = "<!-- END GENERATED STARTUP IMPORTS -->";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");

function readRequired(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`missing startup source: ${relativePath}`);
  const content = fs.readFileSync(absolutePath, "utf8");
  if (!content.trim()) throw new Error(`empty startup source: ${relativePath}`);
  return content;
}

export function readStartupSources(root = DEFAULT_ROOT) {
  return Object.fromEntries(
    STARTUP_SOURCES.map((relativePath) => [relativePath, readRequired(root, relativePath)]),
  );
}

export function renderCodexBootstrap(sources) {
  const sections = STARTUP_SOURCES.map((relativePath) => {
    const content = sources[relativePath];
    if (typeof content !== "string" || !content.trim()) {
      throw new Error(`missing or empty rendered source: ${relativePath}`);
    }
    return [
      `<!-- BEGIN SOURCE: ${relativePath} -->`,
      content.trimEnd(),
      `<!-- END SOURCE: ${relativePath} -->`,
    ].join("\n");
  });

  const output = [
    "<!-- GENERATED FILE. Do not edit directly. Run: npm run agent:sync -->",
    "# Codex startup instruction bootstrap",
    "",
    "The following canonical sources are projected in full so Codex loads them before work begins.",
    "",
    ...sections,
    "",
  ].join("\n");

  const byteLength = Buffer.byteLength(output, "utf8");
  if (byteLength > MAX_CODEX_BYTES) {
    throw new Error(
      `Codex bootstrap is ${byteLength} bytes; maximum is ${MAX_CODEX_BYTES}. ` +
        "Reduce always-loaded sources before synchronizing.",
    );
  }
  return output;
}

export function renderClaudeImportBlock() {
  return [
    CLAUDE_BLOCK_START,
    ...STARTUP_SOURCES.map((relativePath) => `@${relativePath}`),
    CLAUDE_BLOCK_END,
  ].join("\n");
}

export function applyClaudeImportBlock(content) {
  const block = renderClaudeImportBlock();
  const start = content.indexOf(CLAUDE_BLOCK_START);
  const end = content.indexOf(CLAUDE_BLOCK_END);

  if ((start === -1) !== (end === -1)) {
    throw new Error("CLAUDE.md has an incomplete generated startup-import block");
  }
  if (start !== -1) {
    if (end < start) throw new Error("CLAUDE.md generated startup-import markers are out of order");
    const after = end + CLAUDE_BLOCK_END.length;
    return `${content.slice(0, start)}${block}${content.slice(after)}`;
  }

  const heading = "# CLAUDE.md";
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) return `${block}\n\n${content}`;
  const insertionPoint = headingIndex + heading.length;
  return `${content.slice(0, insertionPoint)}\n\n${block}${content.slice(insertionPoint)}`;
}

function writeAtomically(absolutePath, content) {
  const temporaryPath = `${absolutePath}.tmp`;
  fs.writeFileSync(temporaryPath, content, "utf8");
  fs.renameSync(temporaryPath, absolutePath);
}

export function synchronize(root = DEFAULT_ROOT) {
  const sources = readStartupSources(root);
  const codex = renderCodexBootstrap(sources);
  const claudePath = path.join(root, CLAUDE_OUTPUT);
  const claude = applyClaudeImportBlock(readRequired(root, CLAUDE_OUTPUT));
  writeAtomically(path.join(root, CODEX_OUTPUT), codex);
  writeAtomically(claudePath, claude);
  return { codexBytes: Buffer.byteLength(codex, "utf8"), sourceCount: STARTUP_SOURCES.length };
}

export function checkSynchronized(root = DEFAULT_ROOT) {
  const violations = [];
  const sources = readStartupSources(root);
  const expectedCodex = renderCodexBootstrap(sources);
  const codexPath = path.join(root, CODEX_OUTPUT);

  if (!fs.existsSync(codexPath)) {
    violations.push(`${CODEX_OUTPUT} is missing`);
  } else if (fs.readFileSync(codexPath, "utf8") !== expectedCodex) {
    violations.push(`${CODEX_OUTPUT} is stale`);
  }

  const claude = readRequired(root, CLAUDE_OUTPUT);
  if (applyClaudeImportBlock(claude) !== claude) {
    violations.push(`${CLAUDE_OUTPUT} startup imports are missing or stale`);
  }
  return violations;
}

function usage() {
  return `Usage: node scripts/sync-agent-instructions.mjs (--write | --check | --print-codex)

  --write        synchronize AGENTS.override.md and the CLAUDE.md import block
  --check        fail if either startup bootstrap has drifted
  --print-codex  print the generated Codex bootstrap without writing`;
}

export function main(argv = process.argv.slice(2), root = DEFAULT_ROOT) {
  if (argv.length !== 1 || !["--write", "--check", "--print-codex"].includes(argv[0])) {
    throw new Error(usage());
  }

  if (argv[0] === "--write") {
    const result = synchronize(root);
    console.log(`agent instructions synchronized: ${result.sourceCount} sources, ${result.codexBytes} Codex bytes`);
    return 0;
  }
  if (argv[0] === "--print-codex") {
    process.stdout.write(renderCodexBootstrap(readStartupSources(root)));
    return 0;
  }

  const violations = checkSynchronized(root);
  if (violations.length > 0) {
    for (const violation of violations) console.error(`agent-instructions: ${violation}`);
    console.error("agent-instructions: run npm run agent:sync");
    return 1;
  }
  console.log("agent startup instructions are synchronized");
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`agent-instructions: ${error.message}`);
    process.exitCode = 2;
  }
}
