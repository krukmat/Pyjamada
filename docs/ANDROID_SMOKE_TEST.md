# Android Validation

Pyjamada has one Android gameplay path and one screenshot tour.

## Fast validation

```bash
npm run test:all
npm run typecheck
```

## Local visual tour

Start an Android emulator and run:

```bash
npm run screenshots:android
```

The command builds a release APK unless `SKIP_BUILD=1` is supplied, installs it, runs the Maestro flow in `maestro/screenshots.yaml`, and writes exactly nine PNG files to:

`artifacts/android-screenshots/`

For repeated UI iteration after the APK already exists:

```bash
SKIP_BUILD=1 npm run screenshots:android
```

The tour covers:

1. main menu
2. run start
3. bed/wake interaction
4. slippers
5. alarm
6. startled state
7. wardrobe
8. successful objective
9. deterministic restart

## CI emulator smoke

`.github/workflows/android-emulator-smoke.yml` builds and launches the release APK on a Pixel 6 / API 35 emulator and publishes APK/screenshot/logcat evidence. It is technical smoke coverage, not a substitute for the human fun gate.
