#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export const WEIGHTS = Object.freeze({
  C: 0.12,
  F: 0.08,
  D: 0.15,
  T: 0.15,
  A: 0.12,
  K: 0.14,
  P: 0.16,
  X: 0.08,
});

export const MODIFIERS = Object.freeze({
  mixed_change: 6,
  no_verification: 12,
});

export const RISK_FLOORS = Object.freeze({
  dependency_or_native: 41,
  architecture_policy: 41,
  gameplay_contract: 56,
  persistence_schema: 56,
  external_write: 56,
  destructive: 71,
  sensitive_data: 71,
});

const VARIABLES = Object.keys(WEIGHTS);

export const LOW_LOCAL_ROLES = Object.freeze({
  author: Object.freeze({ model: "devstral-small-2:24b-instruct-2512-q4_K_M", runtime: "ollama" }),
  firstReviewer: Object.freeze({ model: "gemma4:26b-a4b-it-qat", runtime: "ollama", context: "fresh" }),
  secondReviewer: Object.freeze({ model: "gpt-oss:20b", runtime: "ollama", context: "separate fresh", num_ctx: 131072 }),
});

const BANDS = [
  {
    upper: 25,
    label: "Low",
    effort: "S",
    model: LOW_LOCAL_ROLES.author.model,
    reasoning: "off",
    gate: "bounded execution from a clear request",
    review: "local Gemma4 task-analysis review plus local GPT-OSS 128K solution review for delegated work",
  },
  {
    upper: 40,
    label: "Moderate",
    effort: "M",
    model: "gpt-5.6-terra",
    reasoning: "medium",
    gate: "compact card unless the exact bounded implementation is already authorized",
    review: "fresh review for behavior changes",
  },
  {
    upper: 55,
    label: "High",
    effort: "L",
    model: "gpt-5.6-terra",
    reasoning: "high",
    gate: "task-analysis review and explicit human approval",
    review: "independent fresh-context solution review required",
  },
  {
    upper: 70,
    label: "Complex",
    effort: "L",
    model: "gpt-5.6-sol",
    reasoning: "high",
    gate: "decompose; approve the plan and executable subtask",
    review: "fresh gpt-5.6-sol review plus human approval",
  },
  {
    upper: 85,
    label: "Critical",
    effort: "XL",
    model: "gpt-5.6-sol",
    reasoning: "xhigh",
    gate: "decompose; approve each boundary and review the diff",
    review: "fresh gpt-5.6-sol review plus human diff review",
  },
  {
    upper: 100,
    label: "Extreme",
    effort: "XL",
    model: "gpt-5.6-sol",
    reasoning: "max",
    gate: "analysis, risk treatment, and decomposition only",
    review: "review the analysis/decomposition; no aggregate implementation",
  },
];

function normalizePath(path) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function startsWithAny(path, prefixes) {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

export function ccToScore(cc) {
  if (!Number.isInteger(cc) || cc < 0) {
    throw new Error("cc must be a non-negative integer");
  }
  if (cc <= 5) return 0;
  if (cc <= 10) return 1;
  if (cc <= 20) return 2;
  if (cc <= 30) return 3;
  if (cc <= 50) return 4;
  return 5;
}

export function countToFileScore(count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("file count must be a non-negative integer");
  }
  if (count <= 1) return 0;
  if (count === 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  if (count <= 20) return 4;
  return 5;
}

export function pathFloors(paths) {
  const floors = { D: 0, P: 0, K: 0 };
  const evidence = [];

  for (const original of paths) {
    const path = normalizePath(original);
    let row;

    if (path === "app.json" || startsWithAny(path, ["android/", "ios/"])) {
      row = { D: 3, P: 3, K: 3, reason: "dependency/build/runtime surface" };
    } else if (path === "package.json") {
      row = { D: 1, P: 1, K: 2, reason: "package scripts/tooling; dependency changes require a risk flag" };
    } else if (path === "App.tsx" || path.startsWith("src/app/")) {
      row = { D: 2, P: 3, K: 3, reason: "user-visible orchestration" };
    } else if (path === "src/game/ports/GameSavePort.ts" || path.startsWith("src/platform/storage/")) {
      row = { D: 4, P: 4, K: 3, reason: "persisted run state" };
    } else if (startsWithAny(path, ["src/platform/settings/", "src/settings/"])) {
      row = { D: 3, P: 4, K: 3, reason: "persisted settings boundary" };
    } else if (path.startsWith("src/game/systemic/")) {
      row = { D: 3, P: 4, K: 3, reason: "authoritative gameplay contract" };
    } else if (path.startsWith("src/game/presentation/")) {
      row = { D: 2, P: 1, K: 3, reason: "transient presentation coupling" };
    } else if (path.startsWith("src/game/render/")) {
      row = { D: 2, P: 1, K: 3, reason: "renderer/framework boundary" };
    } else if (startsWithAny(path, ["scripts/", "maestro/"])) {
      row = { D: 1, P: 1, K: 2, reason: "tooling/evidence workflow" };
    } else if (path.startsWith("assets/game/")) {
      row = { D: 1, P: 2, K: 1, reason: "user-visible original game asset" };
    } else if (path.startsWith("docs/") || path.endsWith(".md") || path.startsWith("tests/")) {
      row = { D: 0, P: 0, K: 0, reason: "documentation or tests" };
    }

    if (!row) {
      evidence.push(`${path}: no automatic D/P/K floor`);
      continue;
    }

    floors.D = Math.max(floors.D, row.D);
    floors.P = Math.max(floors.P, row.P);
    floors.K = Math.max(floors.K, row.K);
    evidence.push(`${path}: D${row.D}/P${row.P}/K${row.K} (${row.reason})`);
  }

  return { floors, evidence };
}

export function resolveBand(score) {
  const band = BANDS.find(({ upper }) => score <= upper);
  if (!band) throw new Error(`RRI must be in range 0-100, got ${score}`);
  return { ...band };
}

function resolveRoute(band, scores, risks) {
  if (
    band.label === "High" &&
    (risks.includes("architecture_policy") || scores.P >= 4 || scores.A >= 4 || scores.X >= 4)
  ) {
    return {
      model: "gpt-5.6-sol",
      reasoning: "high",
      rationale: "High-band architecture, impact, ambiguity, or context driver requires Premium capability",
    };
  }
  return {
    model: band.model,
    reasoning: band.reasoning,
    rationale: "default capability route for the final RRI band",
  };
}

function resolveRoleRoutes(band, route) {
  if (band.label === "Low") return LOW_LOCAL_ROLES;
  if (band.label === "Extreme") {
    return {
      author: { model: "n/a", reason: "decomposition only" },
      firstReviewer: { model: route.model, reasoning: route.reasoning, context: "fresh decomposition review" },
      secondReviewer: { model: "n/a", reason: "no executable aggregate task" },
    };
  }
  return {
    author: { model: route.model, reasoning: route.reasoning },
    firstReviewer: { model: route.model, reasoning: route.reasoning, context: "fresh" },
    secondReviewer: { model: route.model, reasoning: route.reasoning, context: "separate fresh" },
  };
}

function assertScore(name, value) {
  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new Error(`${name} must be an integer from 0 to 5`);
  }
}

export function evaluateRri({
  cc,
  C,
  touches = [],
  D,
  T,
  A,
  K,
  P,
  X,
  modifiers = [],
  risks = [],
  lowConfidence = [],
}) {
  if ((cc === undefined) === (C === undefined)) {
    throw new Error("provide exactly one of cc or C");
  }

  const uniquePaths = [...new Set(touches.map(normalizePath))];
  const cScore = cc === undefined ? C : ccToScore(cc);
  const scores = {
    C: cScore,
    F: countToFileScore(uniquePaths.length),
    D,
    T,
    A,
    K,
    P,
    X,
  };

  for (const variable of VARIABLES) assertScore(variable, scores[variable]);

  const { floors, evidence: pathEvidence } = pathFloors(uniquePaths);
  for (const variable of ["D", "P", "K"]) {
    scores[variable] = Math.max(scores[variable], floors[variable]);
  }

  const low = [...new Set(lowConfidence.map((value) => value.toUpperCase()))];
  for (const variable of low) {
    if (!VARIABLES.includes(variable)) {
      throw new Error(`unknown low-confidence variable: ${variable}`);
    }
    scores[variable] = Math.min(5, scores[variable] + 1);
  }

  const modifierNames = [...new Set(modifiers)];
  for (const modifier of modifierNames) {
    if (!(modifier in MODIFIERS)) throw new Error(`unknown modifier: ${modifier}`);
  }

  const riskNames = [...new Set(risks)];
  for (const risk of riskNames) {
    if (!(risk in RISK_FLOORS)) throw new Error(`unknown risk: ${risk}`);
  }

  const contributions = Object.fromEntries(
    VARIABLES.map((variable) => [variable, 20 * WEIGHTS[variable] * scores[variable]]),
  );
  const base = Math.round(Object.values(contributions).reduce((sum, value) => sum + value, 0));
  const modifierTotal = modifierNames.reduce((sum, name) => sum + MODIFIERS[name], 0);
  const floorValues = riskNames.map((name) => RISK_FLOORS[name]);
  if (modifierNames.includes("no_verification")) floorValues.push(56);
  const riskFloor = floorValues.length > 0 ? Math.max(...floorValues) : 0;
  const final = Math.min(100, Math.max(base + modifierTotal, riskFloor));
  const band = resolveBand(final);
  const route = resolveRoute(band, scores, riskNames);
  const roles = resolveRoleRoutes(band, route);

  const triggers = [];
  if (final >= 56) triggers.push("RRI >= 56");
  if (scores.F >= 4 && scores.K >= 3) triggers.push("F >= 4 and K >= 3");
  if (modifierNames.includes("mixed_change")) triggers.push("mixed refactor and behavior change");
  if (modifierNames.includes("no_verification")) triggers.push("no credible verification strategy");

  const dominant = Object.entries(contributions)
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([variable, value]) => `${variable} (${value.toFixed(1)})`);
  if (riskNames.length > 0) dominant.unshift(`risk floor: ${riskNames.join(", ")}`);

  return {
    scores,
    contributions,
    paths: uniquePaths,
    pathEvidence,
    lowConfidence: low,
    base,
    modifiers: modifierNames.map((name) => ({ name, value: MODIFIERS[name] })),
    modifierTotal,
    risks: riskNames.map((name) => ({ name, floor: RISK_FLOORS[name] })),
    riskFloor,
    final,
    band,
    route,
    roles,
    dominant: dominant.slice(0, 3),
    decomposition: {
      required: triggers.length > 0,
      triggers,
    },
  };
}

export function renderMarkdown(result) {
  const rows = VARIABLES.map((variable) =>
    `| ${variable} | ${result.scores[variable]} | ${result.contributions[variable].toFixed(1)} |`,
  );
  const modifiers = result.modifiers.length
    ? result.modifiers.map(({ name, value }) => `${name} (+${value})`).join(", ")
    : "none";
  const risks = result.risks.length
    ? result.risks.map(({ name, floor }) => `${name} (floor ${floor})`).join(", ")
    : "none";
  const confidence = result.lowConfidence.length ? result.lowConfidence.join(", ") : "none";
  const pathEvidence = result.pathEvidence.length ? result.pathEvidence.join("; ") : "no paths supplied";
  const decomposition = result.decomposition.required
    ? `required: ${result.decomposition.triggers.join("; ")}`
    : "not required";

  return [
    "| Variable | Score | Weighted points |",
    "|---|---:|---:|",
    ...rows,
    "",
    `**Base:** ${result.base}`,
    `**Quality modifiers:** ${modifiers}`,
    `**Categorical floors:** ${risks}`,
    `**Path-floor evidence:** ${pathEvidence}`,
    `**Low-confidence uplift:** ${confidence}`,
    `**Final RRI:** ${result.final} -> ${result.band.label} -> Effort ${result.band.effort}`,
    `**Capability route:** ${result.route.model}/${result.route.reasoning} (${result.route.rationale})`,
    `**Author model:** ${result.roles.author.model}`,
    `**1st Reviewer model:** ${result.roles.firstReviewer.model}`,
    `**2nd Reviewer model:** ${result.roles.secondReviewer.model}${result.roles.secondReviewer.num_ctx ? ` (num_ctx=${result.roles.secondReviewer.num_ctx})` : ""}`,
    "**Execution surface:** classify separately with AGENT_WORKFLOW_GUIDE.md; Low does not imply local-model delegation",
    `**Approval gate:** ${result.band.gate}`,
    `**Review:** ${result.band.review}`,
    `**Dominant drivers:** ${result.dominant.join(", ") || "none"}`,
    `**Decomposition:** ${decomposition}`,
  ].join("\n");
}

function usage() {
  return `Deterministic Pyjamada RRI v2 calculator

Usage:
  node scripts/rri.mjs --touches PATH [--touches PATH ...] (--cc RAW | --C 0-5) \\
    --D 0-5 --T 0-5 --A 0-5 --K 0-5 --P 0-5 --X 0-5 \\
    [--modifier KEY] [--risk KEY] [--low-confidence A,X] [--json]

Modifiers: ${Object.keys(MODIFIERS).join(", ")}
Risks: ${Object.keys(RISK_FLOORS).join(", ")}`;
}

function parseInteger(option, raw) {
  if (raw === undefined || !/^-?\d+$/.test(raw)) throw new Error(`${option} requires an integer`);
  return Number.parseInt(raw, 10);
}

export function parseArgs(argv) {
  const parsed = { touches: [], modifiers: [], risks: [], lowConfidence: [], json: false };
  const valueOptions = new Set(["--touches", "--cc", "--C", "--D", "--T", "--A", "--K", "--P", "--X", "--modifier", "--risk", "--low-confidence"]);

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

    if (option === "--touches") parsed.touches.push(value);
    else if (option === "--modifier") parsed.modifiers.push(value);
    else if (option === "--risk") parsed.risks.push(value);
    else if (option === "--low-confidence") parsed.lowConfidence.push(...value.split(",").filter(Boolean));
    else parsed[option.slice(2)] = parseInteger(option, value);
  }

  return parsed;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return 0;
  }

  for (const variable of ["D", "T", "A", "K", "P", "X"]) {
    if (args[variable] === undefined) throw new Error(`--${variable} is required`);
  }

  const result = evaluateRri(args);
  console.log(args.json ? JSON.stringify(result, null, 2) : renderMarkdown(result));
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`rri: ${error.message}`);
    console.error("Run with --help for usage.");
    process.exitCode = 2;
  }
}
