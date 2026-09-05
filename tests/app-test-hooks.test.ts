import { isTestHooksEnabled } from '../src/app/testHooks';

function equal(actual: unknown, expected: unknown, label: string) { if (actual !== expected) throw new Error(`${label}: ${actual} !== ${expected}`); }

const original = process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS;
function restore() {
  if (original === undefined) delete process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS;
  else process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS = original;
}

try {
  delete process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS;
  equal(isTestHooksEnabled(), false, 'disabled by default when the env var is unset');

  process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS = '1';
  equal(isTestHooksEnabled(), true, 'enabled when the env var is exactly "1"');

  process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS = '0';
  equal(isTestHooksEnabled(), false, 'disabled for "0"');

  process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS = 'true';
  equal(isTestHooksEnabled(), false, 'disabled for any value other than the exact string "1", including "true"');

  process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS = '';
  equal(isTestHooksEnabled(), false, 'disabled for an empty string');
} finally {
  restore();
}

console.log('app test-hooks tests passed');
