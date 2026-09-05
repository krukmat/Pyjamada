// T-05: single source of truth for whether test-only debug hooks are
// rendered. Gated on an Expo public env var, which Metro inlines as a
// build-time constant — false in every ordinary build (npm run android,
// release builds, CI) unless a build step explicitly opts in. Only
// scripts/android-screenshots.sh sets this, and only for its own build step.
export function isTestHooksEnabled(): boolean {
  return process.env.EXPO_PUBLIC_PYJAMADA_TEST_HOOKS === '1';
}
