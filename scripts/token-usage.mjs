#!/usr/bin/env node

import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

// Reads only usage counters, model names, timestamps, ids and cwd from local
// agent transcripts. Conversation content is never copied into the report.

export const TOKEN_FIELDS = Object.freeze(["input", "cacheWrite", "cacheRead", "output"]);

function emptyTotals() {
  return { requests: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, reasoning: 0, total: 0 };
}

function addUsage(target, usage) {
  target.requests += 1;
  for (const field of TOKEN_FIELDS) target[field] += usage[field];
  target.reasoning += usage.reasoning;
  target.total += TOKEN_FIELDS.reduce((sum, field) => sum + usage[field], 0);
}

function count(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function isInside(root, candidate) {
  if (typeof candidate !== "string") return false;
  const rel = relative(root, resolve(candidate));
  return !isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${sep}`);
}

function listFiles(dir, predicate) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(path, predicate));
    else if (predicate(entry.name)) found.push(path);
  }
  return found.sort();
}

function parseLines(path) {
  const records = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line));
    } catch {
      // Interrupted writes can leave a partial trailing line; skip it.
    }
  }
  return records;
}

function readFirstLine(path) {
  const fd = openSync(path, "r");
  try {
    const chunks = [];
    const buffer = Buffer.alloc(65536);
    let bytes;
    while ((bytes = readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      const newline = buffer.subarray(0, bytes).indexOf(10);
      if (newline >= 0) {
        chunks.push(Buffer.from(buffer.subarray(0, newline)));
        break;
      }
      chunks.push(Buffer.from(buffer.subarray(0, bytes)));
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

export function encodeClaudeProjectDir(root) {
  return root.replace(/[^a-zA-Z0-9]/g, "-");
}

export function collectClaudeUsage({ root, claudeDir }) {
  const projectsDir = join(claudeDir, "projects");
  if (!existsSync(projectsDir)) return [];
  const encoded = encodeClaudeProjectDir(root);
  const candidates = readdirSync(projectsDir).filter((name) => name === encoded || name.startsWith(`${encoded}-`));
  const seen = new Set();
  const entries = [];

  for (const dirName of candidates.sort()) {
    const exact = dirName === encoded;
    const dir = join(projectsDir, dirName);
    if (!statSync(dir).isDirectory()) continue;

    for (const path of listFiles(dir, (name) => name.endsWith(".jsonl"))) {
      const parts = relative(dir, path).split(sep);
      const isSubagent = parts.length === 3 && parts[1] === "subagents";
      if (parts.length !== 1 && !isSubagent) continue;
      const session = isSubagent ? parts[0] : basename(path, ".jsonl");
      const agent = isSubagent ? basename(path, ".jsonl") : null;

      for (const record of parseLines(path)) {
        const message = record?.message;
        const usage = message?.usage;
        if (!usage || typeof message !== "object") continue;
        if (record.cwd ? !isInside(root, record.cwd) : !exact) continue;
        const key = message.id ?? record.requestId ?? record.uuid;
        if (key) {
          if (seen.has(key)) continue;
          seen.add(key);
        }
        const normalized = {
          input: count(usage.input_tokens),
          cacheWrite: count(usage.cache_creation_input_tokens),
          cacheRead: count(usage.cache_read_input_tokens),
          output: count(usage.output_tokens),
          reasoning: 0,
        };
        if (TOKEN_FIELDS.every((field) => normalized[field] === 0)) continue;
        entries.push({
          source: "claude",
          session,
          agent,
          model: message.model ?? "unknown",
          timestamp: record.timestamp ?? "",
          usage: normalized,
        });
      }
    }
  }
  return entries;
}

function codexDelta(current, previous) {
  const fields = ["input_tokens", "cached_input_tokens", "cache_write_input_tokens", "output_tokens", "reasoning_output_tokens"];
  const reset = previous && fields.some((field) => count(current[field]) < count(previous[field]));
  const base = previous && !reset ? previous : {};
  const delta = Object.fromEntries(fields.map((field) => [field, count(current[field]) - count(base[field])]));
  const cached = delta.cached_input_tokens;
  const written = delta.cache_write_input_tokens;
  return {
    input: Math.max(0, delta.input_tokens - cached - written),
    cacheWrite: written,
    cacheRead: cached,
    output: delta.output_tokens,
    reasoning: delta.reasoning_output_tokens,
  };
}

export function collectCodexUsage({ root, codexDir }) {
  const files = ["sessions", "archived_sessions"].flatMap((name) =>
    listFiles(join(codexDir, name), (file) => file.endsWith(".jsonl")),
  );
  const seenSessions = new Set();
  const entries = [];

  for (const path of files) {
    let meta;
    try {
      meta = JSON.parse(readFirstLine(path));
    } catch {
      continue;
    }
    if (meta?.type !== "session_meta" || !isInside(root, meta.payload?.cwd)) continue;
    const session = meta.payload.id ?? meta.payload.session_id ?? basename(path, ".jsonl");
    if (seenSessions.has(session)) continue;
    seenSessions.add(session);

    let model = "unknown";
    let previous = null;
    for (const record of parseLines(path)) {
      const payload = record?.payload;
      if (record?.type === "turn_context" && payload?.model) model = payload.model;
      else if (payload?.type === "thread_settings_applied" && payload.thread_settings?.model) model = payload.thread_settings.model;
      const total = payload?.type === "token_count" ? payload.info?.total_token_usage : null;
      if (!total) continue;
      const usage = codexDelta(total, previous);
      previous = total;
      if (TOKEN_FIELDS.every((field) => usage[field] === 0)) continue;
      entries.push({ source: "codex", session, agent: null, model, timestamp: record.timestamp ?? "", usage });
    }
  }
  return entries;
}

export function filterEntries(entries, { since, until, session, source } = {}) {
  return entries.filter((entry) => {
    const day = entry.timestamp.slice(0, 10);
    if (since && day < since) return false;
    if (until && day > until) return false;
    if (session && !entry.session.startsWith(session)) return false;
    if (source && entry.source !== source) return false;
    return true;
  });
}

function groupBy(entries, keyOf) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    if (!groups.has(key)) groups.set(key, { key, ...emptyTotals() });
    addUsage(groups.get(key), entry.usage);
  }
  return [...groups.values()];
}

export function summarize(entries, { top = 10 } = {}) {
  const totals = emptyTotals();
  const sessions = new Map();
  for (const entry of entries) {
    addUsage(totals, entry.usage);
    const key = `${entry.source}:${entry.session}`;
    if (!sessions.has(key)) {
      sessions.set(key, { key, source: entry.source, session: entry.session, firstSeen: "", agents: new Set(), models: new Set(), ...emptyTotals() });
    }
    const row = sessions.get(key);
    addUsage(row, entry.usage);
    if (entry.agent) row.agents.add(entry.agent);
    row.models.add(entry.model);
    if (entry.timestamp && (!row.firstSeen || entry.timestamp < row.firstSeen)) row.firstSeen = entry.timestamp;
  }

  const byTotal = (a, b) => b.total - a.total || a.key.localeCompare(b.key);
  return {
    totals,
    bySource: groupBy(entries, (entry) => entry.source).sort(byTotal),
    byModel: groupBy(entries, (entry) => `${entry.source}:${entry.model}`).sort(byTotal),
    byDay: groupBy(entries, (entry) => entry.timestamp.slice(0, 10) || "unknown").sort((a, b) => a.key.localeCompare(b.key)),
    sessionCount: sessions.size,
    topSessions: [...sessions.values()]
      .sort(byTotal)
      .slice(0, top)
      .map(({ agents, models, ...row }) => ({ ...row, subagents: agents.size, models: [...models].sort() })),
  };
}

export function formatTokens(value) {
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return String(value);
}

function share(value, total) {
  return total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0.0%";
}

function tokenCells(row) {
  return [row.requests, ...TOKEN_FIELDS.map((field) => formatTokens(row[field])), formatTokens(row.total)];
}

function table(header, rows) {
  return [
    `| ${header.join(" | ")} |`,
    `|${header.map((_, index) => (index === 0 ? "---" : "---:")).join("|")}|`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

export function renderMarkdown(summary, filters = {}) {
  const tokenHeader = ["Requests", "Input", "Cache write", "Cache read", "Output", "Total"];
  const scope = Object.entries(filters)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  const lines = [
    "## Token usage",
    "",
    `Scope: ${scope || "all local history"}. Days are UTC. Counts are tokens, not subscription quota.`,
    "",
  ];

  if (summary.totals.requests === 0) return [...lines, "No usage records found."].join("\n");

  lines.push(
    table(["Source", ...tokenHeader, "Share"], [
      ...summary.bySource.map((row) => [row.key, ...tokenCells(row), share(row.total, summary.totals.total)]),
      ["**all**", ...tokenCells(summary.totals), "100.0%"],
    ]),
    "",
    "### By model",
    "",
    table(["Model", ...tokenHeader, "Share"], summary.byModel.map((row) => [row.key, ...tokenCells(row), share(row.total, summary.totals.total)])),
    "",
    `### Top sessions (${summary.topSessions.length} of ${summary.sessionCount})`,
    "",
    table(
      ["Session", "Started (UTC)", "Subagents", ...tokenHeader, "Share"],
      summary.topSessions.map((row) => [
        `${row.source}:${row.session.slice(0, 8)}`,
        row.firstSeen ? row.firstSeen.slice(0, 16).replace("T", " ") : "unknown",
        row.subagents,
        ...tokenCells(row),
        share(row.total, summary.totals.total),
      ]),
    ),
    "",
    "### By day",
    "",
    table(["Day", ...tokenHeader], summary.byDay.map((row) => [row.key, ...tokenCells(row)])),
  );
  if (summary.totals.reasoning > 0) {
    lines.push("", `Codex reasoning tokens (already included in output): ${formatTokens(summary.totals.reasoning)}.`);
  }
  return lines.join("\n");
}

function usage() {
  return `Local token usage report for this project (Claude Code + Codex transcripts)

Usage:
  node scripts/token-usage.mjs [--since YYYY-MM-DD] [--until YYYY-MM-DD]
    [--session ID_PREFIX] [--source claude|codex] [--top N] [--json]
    [--root PATH] [--claude-dir PATH] [--codex-dir PATH]

Defaults: --root is the current directory, --claude-dir ~/.claude, --codex-dir ~/.codex, --top 10.`;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseArgs(argv) {
  const parsed = { json: false, top: 10 };
  const valueOptions = new Set(["--since", "--until", "--session", "--source", "--top", "--root", "--claude-dir", "--codex-dir"]);

  for (let index = 0; index < argv.length; index += 1) {
    let option = argv[index];
    let inlineValue;
    if (option.includes("=")) [option, inlineValue] = option.split(/=(.*)/s, 2);

    if (option === "--json") {
      parsed.json = true;
      continue;
    }
    if (option === "--help" || option === "-h") {
      parsed.help = true;
      continue;
    }
    if (!valueOptions.has(option)) throw new Error(`unknown option: ${option}`);

    const value = inlineValue ?? argv[++index];
    if (value === undefined) throw new Error(`${option} requires a value`);

    if (option === "--since" || option === "--until") {
      if (!DAY.test(value)) throw new Error(`${option} requires YYYY-MM-DD`);
      parsed[option.slice(2)] = value;
    } else if (option === "--source") {
      if (value !== "claude" && value !== "codex") throw new Error("--source must be claude or codex");
      parsed.source = value;
    } else if (option === "--top") {
      if (!/^\d+$/.test(value) || Number(value) < 1) throw new Error("--top requires a positive integer");
      parsed.top = Number(value);
    } else if (option === "--claude-dir") parsed.claudeDir = value;
    else if (option === "--codex-dir") parsed.codexDir = value;
    else parsed[option.slice(2)] = value;
  }

  return parsed;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }

  const root = resolve(args.root ?? process.cwd());
  const claudeDir = resolve(args.claudeDir ?? join(homedir(), ".claude"));
  const codexDir = resolve(args.codexDir ?? join(homedir(), ".codex"));
  const filters = { since: args.since, until: args.until, session: args.session, source: args.source };

  const entries = filterEntries(
    [...collectClaudeUsage({ root, claudeDir }), ...collectCodexUsage({ root, codexDir })],
    filters,
  );
  const summary = summarize(entries, { top: args.top });
  console.log(args.json ? JSON.stringify({ root, filters, ...summary }, null, 2) : renderMarkdown(summary, filters));
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`token-usage: ${error.message}`);
    console.error("Run with --help for usage.");
    process.exitCode = 2;
  }
}
