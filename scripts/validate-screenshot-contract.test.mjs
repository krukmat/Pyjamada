import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYamlScreenshotNames,
  extractRunnerScreenshotNames,
  diffScreenshotContract,
  describeProblems,
  YAML_PATH,
  RUNNER_PATH,
} from './validate-screenshot-contract.mjs';
import fs from 'node:fs';

const SAMPLE_YAML = `appId: com.krukmat.pyjamada
---
- takeScreenshot:
    path: 01_main_menu
- tapOn:
    id: settings-button
- takeScreenshot:
    path: 02_settings
`;

const SAMPLE_RUNNER = `EXPECTED_SCREENSHOTS=(
  "01_main_menu.png"
  "02_settings.png"
)
`;

test('extractYamlScreenshotNames parses block-form takeScreenshot entries in order and normalizes .png', () => {
  assert.deepEqual(extractYamlScreenshotNames(SAMPLE_YAML), ['01_main_menu.png', '02_settings.png']);
});

test('extractYamlScreenshotNames throws on a takeScreenshot with no path line', () => {
  assert.throws(() => extractYamlScreenshotNames('- takeScreenshot:\n- tapOn:\n    id: x\n'));
});

test('extractRunnerScreenshotNames parses the bash array', () => {
  assert.deepEqual(extractRunnerScreenshotNames(SAMPLE_RUNNER), ['01_main_menu.png', '02_settings.png']);
});

test('extractRunnerScreenshotNames throws when the array is absent', () => {
  assert.throws(() => extractRunnerScreenshotNames('echo hi\n'));
});

test('diffScreenshotContract reports no problems when both sides agree', () => {
  const result = diffScreenshotContract(['01_main_menu.png', '02_settings.png'], ['01_main_menu.png', '02_settings.png']);
  assert.deepEqual(result, { missing: [], extra: [], duplicatesInYaml: [], duplicatesInRunner: [] });
  assert.deepEqual(describeProblems(result), []);
});

test('a screenshot missing from the yaml flow is reported by exact name', () => {
  const result = diffScreenshotContract(['01_main_menu.png'], ['01_main_menu.png', '02_settings.png']);
  assert.deepEqual(result.missing, ['02_settings.png']);
  assert.deepEqual(result.extra, []);
  assert.match(describeProblems(result)[0], /not produced by maestro\/screenshots\.yaml: 02_settings\.png/);
});

test('a screenshot the yaml flow produces but the runner does not expect is reported as extra', () => {
  const result = diffScreenshotContract(['01_main_menu.png', '99_extra.png'], ['01_main_menu.png']);
  assert.deepEqual(result.extra, ['99_extra.png']);
  assert.deepEqual(result.missing, []);
  assert.match(describeProblems(result)[0], /not expected by scripts\/android-screenshots\.sh: 99_extra\.png/);
});

test('a renamed screenshot fails on both sides with exact names', () => {
  const result = diffScreenshotContract(['01_main_menu.png', '09_success_state.png'], ['01_main_menu.png', '09_success.png']);
  assert.deepEqual(result.missing, ['09_success.png']);
  assert.deepEqual(result.extra, ['09_success_state.png']);
});

test('a duplicate name within the yaml flow is reported', () => {
  const result = diffScreenshotContract(['01_main_menu.png', '01_main_menu.png'], ['01_main_menu.png']);
  assert.deepEqual(result.duplicatesInYaml, ['01_main_menu.png']);
});

test('a duplicate name within the runner expectations is reported', () => {
  const result = diffScreenshotContract(['01_main_menu.png'], ['01_main_menu.png', '01_main_menu.png']);
  assert.deepEqual(result.duplicatesInRunner, ['01_main_menu.png']);
});

test('the real maestro flow and runner script agree today', () => {
  const yamlNames = extractYamlScreenshotNames(fs.readFileSync(YAML_PATH, 'utf8'));
  const runnerNames = extractRunnerScreenshotNames(fs.readFileSync(RUNNER_PATH, 'utf8'));
  const result = diffScreenshotContract(yamlNames, runnerNames);
  assert.deepEqual(describeProblems(result), []);
});
