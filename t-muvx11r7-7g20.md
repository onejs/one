---
id: t-muvx11r7-7g20
title: Audit Expo service parity and repair FileSystem contracts
status: done
assignees:
- s11715
labels:
- branch:fix/one-expo-services
- lane:expo-services
- umbrella:plans/one-native-coverage.md
backend: git
commits:
- b49bcf631
created_at: 1791245007907
updated_at: 1791245665084
field_marks:
  active_form: 1791245007907
  body: 1791245665084
  claim: 1791245007907
  evidence_summary: 1791245007907
  parent: 1791245007907
  priority: 1791245007907
  recovery_ref: 1791245007907
  status: 1791245665020
  title: 1791245007907
---
Implementation landed and pushed to v2-beta as b49bcf631; source branch fix/one-expo-services also pushed. Audit and durable evidence: plans/one-native-expo-services.md. RAN: regression fails before fix; Swift Foundation tests 3 passed after; arm64 iOS18 simulator/iOS27 SDK harness build passed with transport stand-ins; service vitest suites 30 passed; Bun shared fixture and Android conformance bundles passed. Delivery remains OPEN on t-muvxdzyx-21te0 under CI owner p63991 for iOS Native Tests full app/Nitro build plus iOS27 file-system and Android37 system runtime receipts. No new public API, no device pass or overall launch readiness claimed. Full Expo parity needs the scoped additions recorded in the audit.
