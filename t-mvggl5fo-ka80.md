---
id: t-mvggl5fo-ka80
title: Investigate Android mount failures after native multipart change
status: done
labels:
- native
- one
- umbrella:t-mv7sbq1k-14fl0
backend: git
created_at: 1792487182020
updated_at: 1792487360446
field_marks:
  active_form: 1792487182020
  body: 1792487360446
  claim: 1792487182020
  evidence_summary: 1792487182020
  owner_status: 1792487182020
  parent: 1792487182020
  priority: 1792487182020
  recovery_ref: 1792487182020
  status: 1792487360446
  title: 1792487182020
---
# Android failures after #982: findings

Finding: the two reported failures do not exercise the multipart implementation in #982. No code change or PR is warranted for that suspected regression.

RAN: downloaded retained logs for jobs 118533573104 (main run 39392854088) and 118499332008 (PR run 39382647762 attempt 1), plus their proof artifacts 12251946411 and 12246613802. Sources retained beside this report. The first PR log request was rejected by gh terminal escape handling; the subsequent request used --allow-escape-sequences.

TESTED by inspection of actual CI captures: main failure 85-failure.xml contains one enabled clickable one-native-speech-stop button, A: start, B: start,error:unknown, and Message: Speech recognition failed with code 5. The preceding successful 84-speech-session-b-opens.xml already contains the same B error. Its predicate accepts startsWith(start), so it passes despite this terminal error. The next predicate requires B to end; HybridOneSpeech.fail clears session, so stop is a no-op after error. Logcat 08:51:19.103 reports Google recognizer S3 error -83103, mapped by Android to code 5. This is a speech-service terminal failure, not missing UI. Whether the upstream S3 failure is environmental or a replacement-session lifecycle defect remains unproven; cancellation and restart occur around 08:51:17.957-18.072. Do not weaken the end assertion or silently accept errors.

TESTED by inspection of actual CI captures: PR 42-failure.xml remains on one-native-android-inputs-screen with textfield, sliders and dialog controls mounted. Logcat 07:15:32.754 key_back_press is immediately followed by hide(ime()) and IME onHidden at 07:15:33.149. The script issues one pressBack before safe-area-home. INFERRED: its Back was consumed dismissing IME rather than navigating; this would be disproved by a navigation pop after that key, absent from the saved final UI. This does not request the safe-area route at all.

TESTED source path: test-native-android.yml starts bun run dev without ONE_NATIVE_BUNDLER=rolldown. native-features/vite.config.ts selects Metro by default. Both saved dev-server.log files show Metro BUNDLE ../../packages/one/metro-entry.js. getReactNativePlugins returns only the Metro plugin in Metro mode, excluding createReactNativeDevServerPlugin modified by #982. Therefore the 10-second multipart parts in that implementation cannot cause these failures. The installed RN 0.88 BundleDownloader and MultipartStreamReader also accept its quoted boundary, JSON status parts and final X-Http-Status framing. No live Android parser repro was necessary once the workflow exclusion and captured causes were established.

The shared waitFor error always appends missing mount marker when passed a marker argument, even when only another predicate fails. This explains why the speech error was described as a mount failure.

Scope: diagnosis only. No source edits, branch, CI dispatch, processes, simulators, claims or new worktree. Existing primary checkout changes belong to others and were preserved. Previous iOS fix PR982 remains merged at 03f0bb4dceb. Review owner p98336; CI owner p96184. Follow-up lanes are Android input/IME sequencing and speech provider/lifecycle reliability, independently of #982.
