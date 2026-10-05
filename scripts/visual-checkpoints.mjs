#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const ARTIFACTS = join(REPO_ROOT, 'artifacts');
const CURRENT_DIR = join(ARTIFACTS, 'android-screenshots');
const BASELINES_DIR = join(ARTIFACTS, 'visual-baselines');
const REVIEW_DIR = join(ARTIFACTS, 'visual-review');
const REVIEW_FILE = join(REVIEW_DIR, 'index.html');

function fail(message) {
  console.error(`visual-checkpoints: ${message}`);
  process.exit(1);
}

function safeLabel(raw) {
  if (!raw || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(raw)) {
    fail('checkpoint label must match [A-Za-z0-9][A-Za-z0-9._-]*');
  }
  return raw;
}

function pngs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.png')).sort();
}

function readRunMeta(dir) {
  const file = join(dir, 'RUN.txt');
  if (!existsSync(file)) return 'RUN.txt not available for this capture';
  return readFileSync(file, 'utf8').trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function baseline(label, force) {
  if (!existsSync(CURRENT_DIR)) fail(`missing current screenshots: ${relative(REPO_ROOT, CURRENT_DIR)}`);
  const files = pngs(CURRENT_DIR);
  if (files.length === 0) fail('current screenshot directory contains no PNG files');

  const target = join(BASELINES_DIR, label);
  if (existsSync(target) && !force) {
    fail(`checkpoint ${label} already exists; pass --force only when intentionally replacing it`);
  }

  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  for (const file of files) cpSync(join(CURRENT_DIR, file), join(target, file));

  const runFile = join(CURRENT_DIR, 'RUN.txt');
  if (existsSync(runFile)) cpSync(runFile, join(target, 'RUN.txt'));

  writeFileSync(
    join(target, 'CHECKPOINT.txt'),
    [
      `label: ${label}`,
      `created: ${new Date().toISOString()}`,
      `screenshots: ${files.length}`,
      '',
    ].join('\n'),
  );

  console.log(`Visual checkpoint ${label}: ${files.length} screenshots copied to ${relative(REPO_ROOT, target)}`);
}

function compare(label) {
  const baselineDir = join(BASELINES_DIR, label);
  if (!existsSync(baselineDir)) fail(`missing checkpoint: ${relative(REPO_ROOT, baselineDir)}`);
  if (!existsSync(CURRENT_DIR)) fail(`missing current screenshots: ${relative(REPO_ROOT, CURRENT_DIR)}`);

  const before = new Set(pngs(baselineDir));
  const current = pngs(CURRENT_DIR);
  const common = current.filter((name) => before.has(name));
  if (common.length === 0) fail(`checkpoint ${label} and current run have no screenshots in common`);

  mkdirSync(REVIEW_DIR, { recursive: true });
  const items = common.map((name) => ({
    name,
    before: `../visual-baselines/${label}/${name}`,
    after: `../android-screenshots/${name}`,
  }));

  const defaultIndex = Math.max(0, common.indexOf('03_haunted_sleepy.png'));
  const beforeMeta = escapeHtml(readRunMeta(baselineDir));
  const afterMeta = escapeHtml(readRunMeta(CURRENT_DIR));
  const data = JSON.stringify(items).replaceAll('</', '<\\/');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pyjamada Visual Review — ${escapeHtml(label)} vs current</title>
<style>
:root { color-scheme: dark; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:#111018; color:#f4edd7; }
* { box-sizing:border-box; }
body { margin:0; padding:24px; background:#111018; }
main { max-width:1180px; margin:0 auto; }
h1 { margin:0 0 4px; font-size:22px; }
.sub { color:#aaa4b5; margin-bottom:18px; }
.toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
select, button { background:#211f2d; color:#f4edd7; border:1px solid #615a74; padding:9px 11px; font:inherit; }
input[type="range"] { width:min(440px,65vw); accent-color:#f1d75c; }
.compare { --split:50%; position:relative; width:min(100%,560px); margin:0 auto; overflow:hidden; border:2px solid #615a74; background:#050509; }
.compare img { display:block; width:100%; height:auto; user-select:none; pointer-events:none; }
.compare .before { position:absolute; inset:0; clip-path:inset(0 calc(100% - var(--split)) 0 0); }
.divider { position:absolute; top:0; bottom:0; left:var(--split); width:2px; background:#f1d75c; transform:translateX(-1px); pointer-events:none; }
.tag { position:absolute; top:10px; padding:5px 8px; background:rgba(5,5,9,.82); border:1px solid #615a74; font-size:11px; pointer-events:none; }
.before-tag { left:10px; }
.after-tag { right:10px; }
.meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:18px; }
.meta pre { white-space:pre-wrap; background:#191723; border:1px solid #383346; padding:12px; margin:4px 0 0; min-height:96px; color:#bcb5c9; }
.legend { display:flex; justify-content:space-between; width:min(100%,560px); margin:8px auto 0; color:#aaa4b5; font-size:12px; }
@media(max-width:700px){ body{padding:12px}.meta{grid-template-columns:1fr} }
</style>
</head>
<body>
<main>
  <h1>Pyjamada visual checkpoint</h1>
  <div class="sub"><strong>${escapeHtml(label)}</strong> → current · ${common.length} comparable screenshots</div>

  <div class="toolbar">
    <select id="shot"></select>
    <label>Reveal <input id="slider" type="range" min="0" max="100" value="50"></label>
    <span id="percent">50%</span>
    <button id="beforeBtn" type="button">Before</button>
    <button id="afterBtn" type="button">After</button>
  </div>

  <div id="compare" class="compare">
    <img id="after" alt="Current screenshot">
    <img id="before" class="before" alt="Checkpoint screenshot">
    <div class="divider"></div>
    <div class="tag before-tag">BEFORE · ${escapeHtml(label)}</div>
    <div class="tag after-tag">CURRENT</div>
  </div>
  <div class="legend"><span>← checkpoint</span><span>current →</span></div>

  <div class="meta">
    <section><strong>Checkpoint provenance</strong><pre>${beforeMeta}</pre></section>
    <section><strong>Current provenance</strong><pre>${afterMeta}</pre></section>
  </div>
</main>
<script>
const items = ${data};
const shot = document.getElementById('shot');
const before = document.getElementById('before');
const after = document.getElementById('after');
const compare = document.getElementById('compare');
const slider = document.getElementById('slider');
const percent = document.getElementById('percent');

items.forEach((item, index) => {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = item.name;
  shot.appendChild(option);
});

function show(index) {
  const item = items[index];
  before.src = item.before;
  after.src = item.after;
  shot.value = String(index);
}
function split(value) {
  compare.style.setProperty('--split', value + '%');
  slider.value = String(value);
  percent.textContent = value + '%';
}

shot.addEventListener('change', () => show(Number(shot.value)));
slider.addEventListener('input', () => split(Number(slider.value)));
document.getElementById('beforeBtn').addEventListener('click', () => split(100));
document.getElementById('afterBtn').addEventListener('click', () => split(0));

show(${defaultIndex});
split(50);
</script>
</body>
</html>`;

  writeFileSync(REVIEW_FILE, html);
  console.log(`Visual review generated: ${relative(REPO_ROOT, REVIEW_FILE)}`);
  console.log(`Open: file://${REVIEW_FILE}`);
}

const [command, rawLabel, ...rest] = process.argv.slice(2);
if (!command || !rawLabel) fail('usage: visual-checkpoints.mjs <baseline|compare> <label> [--force]');
const label = safeLabel(rawLabel);

if (command === 'baseline') baseline(label, rest.includes('--force'));
else if (command === 'compare') compare(label);
else fail('usage: visual-checkpoints.mjs <baseline|compare> <label> [--force]');
