// T-01: bidirectional contract check between the Maestro screenshot flow and
// the runner's expected-evidence list. A name present on only one side
// (missing, extra, or renamed) or repeated on either side must fail with the
// exact name(s) involved — a spot-check grep for a handful of fixed names is
// not enough to catch a silent rename or an added/removed checkpoint.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const YAML_PATH = path.join(__dirname, '..', 'maestro', 'screenshots.yaml');
export const RUNNER_PATH = path.join(__dirname, 'android-screenshots.sh');

export function extractYamlScreenshotNames(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const names = [];
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim().replace(/^-\s+/, '');
    if (trimmed === 'takeScreenshot:') {
      const next = (lines[index + 1] ?? '').trim();
      const match = next.match(/^path:\s*(.+)$/);
      if (!match) throw new Error(`takeScreenshot at line ${index + 1} has no path on the following line`);
      names.push(match[1].trim());
      continue;
    }
    if (trimmed.startsWith('takeScreenshot:')) {
      const inline = trimmed.slice('takeScreenshot:'.length).trim();
      if (inline) names.push(inline);
    }
  }
  return names.map((name) => (name.endsWith('.png') ? name : `${name}.png`));
}

export function extractRunnerScreenshotNames(shText) {
  const arrayMatch = shText.match(/EXPECTED_SCREENSHOTS=\(([\s\S]*?)\)/);
  if (!arrayMatch) throw new Error('EXPECTED_SCREENSHOTS array not found in the runner script');
  const names = [];
  const itemPattern = /"([^"]+)"/g;
  let match;
  while ((match = itemPattern.exec(arrayMatch[1])) !== null) names.push(match[1]);
  return names;
}

function findDuplicates(names) {
  const seen = new Set();
  const duplicates = new Set();
  for (const name of names) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
}

export function diffScreenshotContract(yamlNames, runnerNames) {
  const duplicatesInYaml = findDuplicates(yamlNames);
  const duplicatesInRunner = findDuplicates(runnerNames);
  const yamlSet = new Set(yamlNames);
  const runnerSet = new Set(runnerNames);
  const missing = runnerNames.filter((name) => !yamlSet.has(name));
  const extra = yamlNames.filter((name) => !runnerSet.has(name));
  return {
    missing: [...new Set(missing)],
    extra: [...new Set(extra)],
    duplicatesInYaml,
    duplicatesInRunner,
  };
}

export function describeProblems({ missing, extra, duplicatesInYaml, duplicatesInRunner }) {
  const problems = [];
  if (duplicatesInYaml.length > 0) {
    problems.push(`duplicate screenshot name(s) in maestro/screenshots.yaml: ${duplicatesInYaml.join(', ')}`);
  }
  if (duplicatesInRunner.length > 0) {
    problems.push(`duplicate screenshot name(s) in scripts/android-screenshots.sh: ${duplicatesInRunner.join(', ')}`);
  }
  if (missing.length > 0) {
    problems.push(`expected by scripts/android-screenshots.sh but not produced by maestro/screenshots.yaml: ${missing.join(', ')}`);
  }
  if (extra.length > 0) {
    problems.push(`produced by maestro/screenshots.yaml but not expected by scripts/android-screenshots.sh: ${extra.join(', ')}`);
  }
  return problems;
}

function main() {
  const yamlText = fs.readFileSync(YAML_PATH, 'utf8');
  const shText = fs.readFileSync(RUNNER_PATH, 'utf8');
  const yamlNames = extractYamlScreenshotNames(yamlText);
  const runnerNames = extractRunnerScreenshotNames(shText);
  const problems = describeProblems(diffScreenshotContract(yamlNames, runnerNames));

  if (problems.length > 0) {
    for (const problem of problems) console.error(`[screenshot-contract] ${problem}`);
    process.exit(1);
  }

  console.log(`[screenshot-contract] OK — ${runnerNames.length} screenshot names agree between the flow and the runner`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
