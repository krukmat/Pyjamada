# Haunted Arcade screenshot review

Run this from `feat/haunted-arcade-mvp` with an Android emulator already running and Maestro installed:

```bash
npm run screenshots:android
```

Use the normal command for the first run. `SKIP_BUILD=1` is only safe when the existing release APK was already produced by the screenshot runner, because the runner enables test-only deterministic capture scenarios at build time.

Successful output is published to:

```text
artifacts/android-screenshots/
```

The 14-shot review set is:

1. `01_main_menu.png`
2. `02_settings.png`
3. `03_haunted_sleepy.png`
4. `04_haunted_wake.png`
5. `05_ghost_telegraph.png`
6. `06_ghost_active.png`
7. `07_wally_jump.png`
8. `08_dream_spark_attack.png`
9. `09_ghost_defeated.png`
10. `10_player_hit.png`
11. `11_dressed_under_pressure.png`
12. `12_escape_ready.png`
13. `13_escaped.png`
14. `14_haunted_failure.png`

Review primarily: Wally scale/readability, consistency between Wally and Ghost pixel language, Dream Spark visibility, hit/invulnerability feedback, Ghost telegraph fairness/readability, bedroom layering, HUD obstruction, exit readability, and whether the overall screen reads as one coherent 80s haunted-arcade game.

The screenshot runner uses deterministic frozen states only for visual evidence. It does not replace the normal real-time gameplay/playtest gate.
