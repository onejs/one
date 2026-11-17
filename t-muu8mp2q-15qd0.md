---
id: t-muu8mp2q-15qd0
title: Implement browser native services
status: done
labels:
- branch:feat/one-native-web
- branch:fix/one-unified-browser-apis
- lane:one-native-web
- umbrella:plans/one-native-launch.md
backend: git
created_at: 1791143561330
updated_at: 1791149520402
field_marks:
  active_form: 1791143561330
  body: 1791149520402
  claim: 1791143561330
  evidence_summary: 1791143561330
  parent: 1791143561330
  priority: 1791143561330
  recovery_ref: 1791143561330
  status: 1791149520327
  title: 1791143561330
---
Completed under Nate direct approval: "Ok fine. These are fine to land then. Just I didn’t want coverage of One.UI but these are ok". Landed 3d5841af00b869bd93a3edf69671962acc53a3d9 on v2-beta; main/native files untouched and broader One.UI coverage excluded. TESTED: Chromium/WebKit namespace probes and negatives. RAN: 150 SSR/docs/effects tests, strict TS, One build, Release 37234826422 and Checks 37234826481 passed. TESTED: exact one@2.0.0-0.canary.1791148136111 source SHA and 15 platform/effect ESM files match local build byte for byte. Final evidence/stop record pushed on fix/one-unified-browser-apis b996ba954, clean worktree ~/.worktrees/one-one-native-web retained. Evidence tests/native-features/evidence/one-native-web/README.md and content-receipt.json; stop state plans/one-native-web.md. Dev server stopped, browsers closed, both wait jobs terminal, no simulator/emulator used. Open physical/browser-boundary limits documented. Next step none; further scope waits for Nate.
