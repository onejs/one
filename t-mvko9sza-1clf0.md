---
id: t-mvko9sza-1clf0
title: Implement native macOS HTTP networking
status: done
active_form: native RN fetch/XHR and active reload proof pass twice; final directed invalid Blob/read and fetch cancellation check underway; approved prelude integration follows
owner_status:
  state: landed
  text: pushed a30893b0ed with HTTP/Blob/FileReader and approved prelude; native RN fetch/XHR/reload proof passes; lead owns consumer/review, ci-manager owns CI
  updated_at: 1792743973444
labels:
- lane:one-macos-networking
- umbrella:one-macos-native
priority: 3
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69303
commits:
- a30893b0edb64c14da2e84653c64a375e18d5c19
- dad00b60f449ac326af7f52706c59e3457bba37f
- edde76ec84b9dde1bdc60e803df57a3139c325b6
created_at: 1792741954294
updated_at: 1792744112499
field_marks:
  active_form: 1792743708533
  body: 1792743973444
  claim: 1792744112499
  claim_current:6a527d1a09ef927165161ca548fa1e1c: 1792744112499
  claim_state:6a527d1a09ef927165161ca548fa1e1c:1792744112499:~:~:~:o:c33b67e557efceca5d38b2965d0eafb2: 1792744112499
  claim_state:c33b67e557efceca5d38b2965d0eafb2:1792742022087:=s69303:=mc-3aa87nk0z4j17:1792742022087:f: 1792742022087
  commit_linked:a30893b0edb64c14da2e84653c64a375e18d5c19: 1792743883695
  commit_linked:dad00b60f449ac326af7f52706c59e3457bba37f: 1792743899509
  commit_linked:edde76ec84b9dde1bdc60e803df57a3139c325b6: 1792742810482
  evidence_summary: 1792741954294
  owner_status: 1792743973444
  parent: 1792741954294
  priority: 1792741954294
  recovery_ref: 1792741954294
  status: 1792743973444
  title: 1792741954294
---
RAN: Networking sendRequest and abortRequest are noops in packages/one/macos/host/OneMacosModules.mm. TESTED by consumer s69247: fetch loopback daemon health times out while curl returns 200 in 13ms. Implement genuine RN 0.88 Networking contract for native macOS, validate real response and failure/cancel/reload lifetime. Keep isolated to host networking module and focused proof; no animation/mounting/index fixture paths. Main feature remains held for owner review. Lead s69213 owns consumer handoff; CI owner ci-manager.

TESTED: installed RN 0.88 clang syntax checks and standalone native NSURLSession manager proof pass for actual daemon health JSON, POST text/header, binary request and base64 response, HTTP 503 body/completion, split UTF-8 incremental data, zero timeout, timeout flag, cancellation, connection failure and module release with active request/no late events. Source edde76ec84 pushed to tm/macos-resume. CI owner ci-manager. Native fetch/XHR/reload validation underway after lead transferred cache/harness. Evidence /Users/n8/.team-machine/evidence/one-networking. Shared tree/cache retained for lead s69213 and consumer.

RAN networking author found required fetch dependency: current BlobModule advertises createFromParts noop, so RN newBlob falsely succeeds; whatwg-fetch selects blob responses and then FileReader native backing is absent. Text/base64 XHR proof already passes; actual fetch remains blocked. Lead authorizes minimal real runtime-scoped BlobModule/FileReader bytes and RN promises plus matchingNetworking integration within this unit, necessary for genuine fetch. No text forcing/capability masking/fallback. Preserve web socket behavior, explicit unsupported contracts and native reload/cancel lifetime; validate realdaemonfetch JSON and decoding. No owner question or newproductdecision needed.

TESTED: full installed RN 0.88 fetch/XHR proof on native MacosBasic succeeds in two runtime generations separated by active-request reload: actual daemon /api/zero/health JSON ok:true, UTF-8 JSON POST/header, HTTP503 body, binary POST, fetch arrayBuffer decoding through Blob/FileReader, sliced Blob POST, split UTF-8 incremental text, XHR binary, timeout, abort, refused-connection rejection. First-generation slow request never completes after reload; second-generation slow request completes. Source at this point includes uncommitted Blob/FileReader backing on edde76ec84. Evidence runtime.log and native-blob-build.log. Final directed released-blob/fetch AbortController checks and encoded prefix refinement pending final build.

Networking unit complete. Pushed origin/tm/macos-resume tip a30893b0ed (remote verified): edde76ec84 HTTP Networking, dad00b60f4 real Blob/FileReader backing, a30893b0ed normal cherry-pick of lead-approved 515ec962e0 preserving its author. No main merge or publication. Task t-mvko9sza-1clf0.

TESTED: incremental MacosBasic Debug build and installed RN0.88 real fetch/XHR in native host, twice across active-request reload. Actual daemon /api/zero/health returns200 JSON ok:true; UTF-8 POST/header, binary POST, fetch arrayBuffer decoding, sliced Blob upload, HTTP503 body, split UTF-8 incremental text, XHR binary, timeout, XHR abort, fetch AbortController and connection failure all pass. Reading a released blob rejects its FileReader Promise. First runtime's slow request never completes after reload; second runtime's does. Earlier standalone native manager proof also established manager deallocation with active request and no late events. No iOS/Android/web byte gate, performance or full consumer acceptance claim. Prelude integration relies on lead's independent review/probe; native proof used native-author saved fixture plus current proof overlay.

Implementation uses NSURLSession with weak delegate ownership and runtime-scoped blob bytes shared by Networking/Blob/FileReader. Blob collectors release bytes with JS lifetime. URI/multipart request bodies return explicit errors. Sending Blob over WebSocket is unsupported; existing WebSocket text/base64 transport is unchanged.

Evidence /Users/n8/.team-machine/evidence/one-networking: runtime.log final generations1/2, provenance.json source/native archive/dylib/bundle hashes, native-final-build.log, manager-proof.log and proof scripts. Focused committed fixtures tests/macos-basic/probe/networking.ts, networking-server.py, NETWORKING.md. Earlier failed harness logs retain diagnosis (unified logging and wrong bridgeless reload accessor); final proof passes.

TRANSFER READY: no owned app/server/log watcher/build remains; all waits terminal, heavy admission released. Shared source /Users/n8/.worktrees/one-macos-resume is clean/pushed. tm worktree remove from primary returned kept, held only by this session's own processes; automatic last-owner exit may remove it despite creator s69213 attached. Reconstruct from origin/tm/macos-resume a30893b0ed at the same path if needed. No uncommitted source to lose.

External cache retained for live lead s69213/consumer s69335: /Volumes/Samsung-1TB-990/builders/one-macos-resume, archive Build/Intermediates.noindex/OneMacosCore/build/libOneMacosCore.a, fixture Build/Products/Debug/MacosBasic.app. Final native bytes match dad00b60f4 native files (also unchanged at a30893b0ed), not pure55bb. Background signed LSUIElement copy retained /Users/n8/Library/Caches/one-macos-networking-s69303/MacosBasic.app for lead adoption; use ONE_MACOS_BUNDLE_URL and ONE_MACOS_DEBUG_DIR, direct executable launch. Old author cache copy untouched. No source/cache lease held by worker after finish.

Lead s69213 owns consumer integration, cross-model review and owner-held feature delivery. CI owner ci-manager owns normal workflows on pushed tip; no CI watch retained. Consumer must rerun actual ControlRoom against this host/prelude.
