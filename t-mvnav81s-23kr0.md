---
id: t-mvnav81s-23kr0
title: Plan One use dom with Expo comparison and implementation proposal
status: done
active_form: Owner approved Opus design and requested continuing together; recording approved scope and starting managed implementation proof.
owner_status:
  state: landed
  text: approved scoped spec/plan on main39e4, current own docs35916c9 pushed and accepted normal landing queue
  updated_at: 1792909642691
assignees:
- s78716
labels:
- lane:one-lead
- umbrella:one
parent_id: t-mvnav7xr-23ka0
backend: git
sessions:
- s78716
commits:
- 16594c1490bda47a4ee4159ab8bb9cc954b4e1f1
- 2e5a93ea2ed4a1282cfbd47376f1404f02e7bf14
- 35916c9d05b7c95bf46a061d0963e474d19214be
- 39e4ab65c4cdaff3f4e2671a42065c0d3f5842a6
- 79f8718f48f71d20abbf002839b435841273bd7f
- 9a519a6526ed20c276fc3f8af0d1cdec60f09d2b
- eba9d7276fe71136208880bf4f3540ec71c96a04
created_at: 1792900837504
updated_at: 1792923878406
field_marks:
  active_form: 1792902853518
  assigned:s78716: 1792900896687
  body: 1792911805217
  claim: 1792923878406
  claim_current:f2c738b52f7e09f3f4fbb35d908f63db: 1792923878406
  claim_state:18070399b333457e015426ac0d37a199:1792900868933:=s78716:=mc-3aa87nk0z4j17:1792900868933:f: 1792900868933
  claim_state:f2c738b52f7e09f3f4fbb35d908f63db:1792923878406:~:~:~:o:18070399b333457e015426ac0d37a199: 1792923878406
  commit_linked:16594c1490bda47a4ee4159ab8bb9cc954b4e1f1: 1792902029466
  commit_linked:2e5a93ea2ed4a1282cfbd47376f1404f02e7bf14: 1792902261143
  commit_linked:35916c9d05b7c95bf46a061d0963e474d19214be: 1792909642493
  commit_linked:39e4ab65c4cdaff3f4e2671a42065c0d3f5842a6: 1792903358798
  commit_linked:79f8718f48f71d20abbf002839b435841273bd7f: 1792903746879
  commit_linked:9a519a6526ed20c276fc3f8af0d1cdec60f09d2b: 1792906516612
  commit_linked:eba9d7276fe71136208880bf4f3540ec71c96a04: 1792901582074
  evidence_summary: 1792900837504
  owner_status: 1792909642691
  parent: 1792900837504
  priority: 1792900837504
  recovery_ref: 1792900837504
  status: 1792909642691
  title: 1792900837504
  unassigned:s69213: 1792900896687
---
Parent lead s69213. Owner exact direction 2026-10-24: "Will you just become sort of the one lead in general and will you add a soul agent on high effort looking into doing a used Dom implementation a quote use DOM similar to how expo router has this basically but if they can find any improvements that fundamentally improve on the implementation I'm all ears. They can share to me their plan and then I will approve it and then they can go ahead and use a couple more SOL helpers as well."

One Sol high effort planner. Investigate current One prototype, actual Expo DOM implementation, and separate Contrast Expo research. Produce a durable scoped spec and actionable design in Contrast; share a concise owner-readable plan for approval. Consider fundamental improvements and dependencies with primary-source evidence. No implementation or helper launches before owner plan approval. Proposed later allocation is two Sol implementation helpers. REVIEW: s69213 reviews the plan before implementation; owner approves product scope.

Lead authorized only the required goals/backlog direct link plus specs/README entry to unblock documentation landing. Preserve foreign edits and use isolated staging. Product implementation remains gated on owner plan approval.

Lead s69213 authorized narrow scope expansion: add the direct backlog.md or goals.md link for plans-hygiene and the specs/README.md entry, preserving surrounding foreign edits with isolated staging. No roadmap rewrite or implementation permission. Source study found actual Rolldown native handoff __vxrnAddNativePlugins plus a One iOS 26-only Swift.WebView; no Android counterpart found. Comparing optional react-native-webview peer versus extending native SDK before recommending.

# Lead review of One DOM proposal

Direction approved for owner review, with two documentation clarifications before the shared proposal. This is approval to present a plan, not owner authorization for runtime implementation or helper launches.

READ: both new spec/plan files, the original owner request in the current conversation, One native plugin handoff locations, updatesPublish recursive asset enumeration, current official Expo DOM guide, and Android local-content guide. The proposal preserves the planning approval boundary, distinguishes existing Expo-compatibility work, and records desktop support as outside the proposed first version. No implementation or device proof performed.

1. Specify successful Promise<void> callbacks and imperative methods. Undefined as a successful no-payload return needs an explicit protocol representation distinct from failure and from nested undefined in data. Error rejections also need a serializable envelope rather than passing Error instances as ordinary supported data. These are ordinary API details, not new scope.

2. The first-production IIFE proof must check lazy module evaluation and side effects, not merely successful import syntax. Rollup explicitly warns that inlineDynamicImports executes previously dynamic-only modules immediately; actual installed Rolldown behavior must be established rather than inferred from Rollup compatibility. Do not equate statically analyzable with semantically safe to fold. Describe lazy-evaluation compatibility as an unresolved first-proof criterion; if not preserved, present the explicit limitation or alternative before claiming support. No need to implement a new module runtime during planning.

Sources: https://docs.expo.dev/guides/dom-components/ ; https://developer.android.com/develop/ui/views/layout/webapps/load-local-content ; https://rollupjs.org/configuration-options/#output-inlinedynamicimports ; https://rolldown.rs/reference/OutputOptions.codeSplitting .

The owner summary should make three choices visible: iOS/Android first with web inline rendering (desktop deferred), optional native WebView peer requiring a rebuild for adopters, and experimental self-contained page packaging trading size/duplication for no asset server. No runtime speed/size advantage established. Incorporate the clarifications, then proceed to normal doc landing and sharing without another review round.

RAN source investigation: installed Expo 58.0.14 / babel-preset-expo 58.0.17 / CLI 58.1.11 plus pinned Expo main d9a0a93589d221b5dcf8c749857408887eaead38 (Expo 58.0.19); source and source digests retained under /Users/n8/.team-machine/evidence/s78716-one-use-dom. INFERRED recommendation from read call paths: One-native Oxc/Vite/Rolldown integration and bridge, optional react-native-webview peer, first iOS/Android plus inline web; no desktop/Metro/Expo-Updates first contract. The initial classic HTML packaging is provisional until offline, size and deferred dynamic-evaluation proofs; a failed proof disproves its viability. Lead s69213 approved direction for owner review and requested two clarifications; incorporated explicit void success/error envelopes and unresolved lazy evaluation. TESTED documentation only: spec-length, own local links/anchors, whitespace/fences and prompt-overfit (1 pass, 0 fail); runtime and performance unmeasured. No helpers, installs, SDK edits, builds or releases. Isolated documentation commit in progress; broader CI manager remains p110356.

# Reuse One WebView planning correction

Owner follow-up relayed verbatim by s78716: "Why would this swift wait swift web view? Don’t we have iOS web view like why is one native not sufficient here?" This is a request to reassess dependency choice, not implementation approval or automatic agreement to reduce platform coverage. Original planner is revising the proposal.

READ by lead: OneNativeWebViewView.swift exposes URL/HTML loading, document-start bootstrap, page-to-native messages, revisioned evaluate/postMessage commands, reload and process-termination events. Its rendered surface is gated on iOS26 and renders clear below that. This gate is in One’s current SwiftUI wrapper; it does not establish that WebKit itself requires iOS26. No Android implementation found by bounded source search. No actual DOM runtime proof performed.

Direction for updated owner proposal: prefer existing One native capabilities, separate demonstrated primitive availability from unproven complete DOM behavior, identify exact missing capabilities and platform backends, and estimate a minimal shared One implementation before recommending a new native dependency. Verify offline/local resource loading, navigation policy and command/lifecycle semantics as part of the proposed proof. Preserve public One generator ownership; no generated-file edits, runtime work, platform coverage decision or new helpers before owner plan approval.

Owner asked on the shared proposal: "Why would this swift wait swift web view? Don’t we have iOS web view like why is one native not sufficient here?" Recorded original chat wording in the spec as a scoped question, not implementation approval. Revised recommendation reuses One WebView, with existing iOS26+ primitives separated from unproven DOM behavior. Mapped iOS17-25 WKWebView backend, absent Android backend, navigation policy, scoped local loading, scroll control and command/lifecycle gaps. No external WebView peer by default; preserve intended iOS/Android coverage and compare minimal One-native additions first. Lead s69213 agrees with refinement; no new helper/reviewer required. RAN normal lander for eba9d7276fe7: refused before queue because merged backlog was 150049 bytes, over150000. Shortening only my new row avoids that obstruction; no foreign content shelved or changed. Revised docs commit forthcoming.

Refinement commit 16594c1490bda47a4ee4159ab8bb9cc954b4e1f1 changes only the existing authored spec/plan and shortens my own backlog row. Revised owner share published from this session as Reuse One’s native WebView. All scoped links/anchors/whitespace/size checks and commit hooks passed again. READ Apple WKWebView docs: native class availability iOS8 and scoped local-file API iOS9 independently confirm that the current One iOS26 gate is in its SwiftUI wrapper, not a WebKit requirement; snapshots retained. No runtime proof claimed. Submitting both authored documentation commits through the normal lander; no remote force-push, foreign cleanup or feature work.

Normal documentation landing accepted source16594c1490bd as ticket refs/land-queue/tickets/000000000001792902157667-16594c1-b5bc1c. Lead s69213/p110356 own subsequent delivery. Additional authored spec-only commit2e5a93ea2ed4 records Nate’s exact new Opus review authorization and retains implementation hold. Owner requested one Opus high-effort teammate, fixed Claude work remaining subscription only. Unpause succeeded; observed week99%, five-hour0%, statuslow. Exactly one actual reviewer s78888 (one-dom-opus-review), claude-opus-5-5 high, launch_account work / strategyfixed / pool[work], is live and reading source. Nested review task t-mvnbn8oo-1gyr0. No other reviewers or implementation helpers launched; no credits/reset/account fallback. This is a one-teammate initial review allocation, not a general standing refill or implementation approval. I retain reviewer custody and will use one exact reply wait; owner will decide suggestions before runtime work.

# Lead synthesis of Opus plan review

READ: /Users/n8/.team-machine/evidence/s78716-one-use-dom/opus-review.md and current Contrast spec/plan. Opus performed source/document review only, not device/build proof. Its native host, module origin, ordered command and startup proposals remain proposals. Original source/review ownership is preserved.

Recommend presenting native resource handlers with standard Vite ESM as the first proof candidate, with three precise limits:

- Stable descriptor IDs remove the need to know final content hashes before emitting native references. They do not remove entry discovery or the requirement to finish/join DOM asset output before native packaging and Updates publication consume it. Keep discovery through the actual graph, including lazy native entries; do not silently substitute a filesystem glob. Namespace resource paths by selected embedded/update identity immediately, and keep any origin/storage semantics explicit.
- A document-start snapshot can avoid an initial JS round trip. Capture the most recent native-committed props for each new document, not the original mount-time snapshot after a reload. Updates after snapshot capture still require reconciliation. Do not promise both zero round-trip first paint and globally latest React props without defining the ordering/visibility rule. Any stale-first-frame behavior must be surfaced and proved, rather than waved away as an invisible flash.
- Distinguish literal reuse of the public Swift.WebView from a new internal One-owned WKWebView host. The latter avoids a third-party dependency but adds native maintenance and overlaps an existing WebKit implementation. Share existing reusable policy/messaging/resource code where practical; explain the actual capability gaps rather than presenting no dependency as no new native work. Custom-scheme ESM, MIME/CORS, secure-context-dependent browser APIs, Android origin-targeted messages and update selection remain first-proof questions.

Treat component-only v1, omitted undefined object fields, and internal host choice as changes proposed to Nate, not accepted scope. Retain the separate void-success/error result semantics. No additional implementation/helper launch or repeated review is authorized by this synthesis. Planner may fold this into its short owner comparison and share it for approval.

DIRECT OWNER APPROVAL 2026-10-24, s78716: "I approve this shared item “Opus review: One DOM design choices — ~/.team-machine/evidence/s78716-one-use-dom” (share share-file-s78716-b2ca08e5203b13fe-1a171534c49-148bbc35141dc96)." Follow-up: "Please work on it together with that agent". This clears the runtime/helper product-plan gate for the shared Opus recommendations: native-owned resource handlers and normal Vite ESM, dedicated OneDOMHost, document-start props, stable descriptor IDs, omitted undefined object fields, component-only v1. Native/module behavior is unproved; first proof may reveal necessary changes. Resume same Opus high thread on fixed Claude work subscription only, no credit/reset/fallback. Original two-Sol implementation helper allocation now available, with nonoverlapping build/runtime slices. No held minor inclusion, release authority, generator ownership takeover or platform coverage reduction inferred. Normal docs lander queued spec quote source2e5a93ea as ticket refs/land-queue/tickets/000000000001792902672848-2e5a93e-2e4c61; p110356/s69213 own downstream delivery.

RAN 9a519a6526ed20c276fc3f8af0d1cdec60f09d2b isolated doc commit, scoped hooks passed; clarifies installed RN0.88 API24 app minimum (library23 is not end-to-end support), Vite browser engine baseline, and completed disposable iOS ESM proof. Previous79f8718 normal lander currently still fetching/indexing origin/main, not queued confirmed; exact own process57954/git74152/index-pack4124 retained. Existing39e4ab ticket alreadyqueued. No direct push, foreign index unchanged. Latest9a source preserved pending same normal landing.

Actual own lander57954 completedexit1:79f8718f submission refused shape checker source mismatch, caller checkout differs fromcandidate: scripts/lib/backlog-shelve.ts and scripts/check/plans-hygiene.ts. No candidate violations evaluated; nothingqueued. Foreignchecker edits/main divergence preserved. Latest9a519a6526ed ownspec+planclarification committed/hooks passed, notqueued. Prior39e4ab approveddesign ticketqueued. Lead s69213 notified exactobstruction; existingCI route owns delivery matchingnormalcheckout. Nativeimplementationcontinuesfeaturetask. No directpush/retry/foreigncheckout mutation.

RAN matching current Contrast checkout now created normally on pro128: /Users/n8/.worktrees/contrast-one-use-dom-docs, tm/one-use-dom-docs, base da8a70e7e8ac13c74ccb066e8a30f08375c85a2d, wt_0c5f329ccee45c82cb30b760; registered s78716 remote custody verified. Current main already contains39e4 design. Primary checkpoint wrapper passed scoped hooks but refused an existing .git/index.lock age2573s, nothing committed/index/ref changed; foreign lock preserved. Author will replay only own79f+9a+current two-doc checkpoint delta onto fresh39-containing main using normal hooks and lander. No primary ref/index mutation or checker waiver.

Current matching tree validates and commits only two owned docs as35916c9d05b7c95bf46a061d0963e474d19214be. This combines pending own79f subscription approval and9a platform clarification with current evidence checkpoint atop main already containing39e4. All current plans-hygiene, board-shape, spec-length hooks pass; localrelative links/diff/limits pass. Source branch tm/one-use-dom-docs is being pushed normally, then current lander submitted --ref HEAD. Primary foreign index.lock and surrounding staged/unstaged edits untouched; newer primary two-doc checkpoint copy remains preserved until normal sync.

Planning deliverable complete and owner approved; implementation continues separately in t-mvnc3bb5-1t20 with same Opus and existing Sol allocation. New current docs source35916c9d05b7c95bf46a061d0963e474d19214be is pushed on Contrast tm/one-use-dom-docs and accepted by current normal lander as refs/land-queue/tickets/000000000001792909586215-35916c9-2e8f01. This supersedes own unqueued79f/9a deltas without rewriting their SHA, no foreign commits/checker adoption. Initial approved design39e4 verified on origin/main. Broader delivery p110356; no docs watcher. Source spec/plan under20k, relative links and all current focused hooks passed; primary foreignindex.lock untouched, latest primary authored checkpoint content preserved and identical to pushed two-doc contents. Isolated docs tree will be removed normally after clean/remote verification, feature shared One tree remains retained for active authors. Owner shares and exact approvals already recorded. Final session finish reserved for active implementation lane, not an idle docs wait.

RAN cleanup complete: normal tm worktree remove action removed wt_0c5f329ccee45c82cb30b760 after exact35916c9 remote branch and clean tree verification; retired source in admitted .trash custody for normal sweep. No persistent docs process/claim/watcher. Fleet-sync direct preservation reply sent in response to its request: own primary docs already safelycommitted/pushed359 and normalqueueaccepted, allforeignprimarywork/indexlock preserved.

2026-10-25 repeated fleet-sync primary realignment notice answered with exact already-pushed35916c9 source/branch and acceptedticket. Only own two docs; conformance-corpus/pixel-comparison.ts and existing index.lock foreign and untouched. Own checkpoint exists identically in pusheddocssource, isolateddocs tree alreadyclean/verified/removed. No new source work or primary cleanup authorized by that repeated notice.

Fleet-sync latest preservation notice: Studio Contrast snapshot tm/salvage-studio-64-contrast-20261025-0702 at de461ff368e4c041ebb8efe44bc380189790d7b4, taskt-mvnhdy0e-y5s0. Our two DOM docs remain independently secured in pushed origin/tm/one-use-dom-docs commit35916c9d05b7c95bf46a061d0963e474d19214be and normal landing ticket refs/land-queue/tickets/000000000001792909586215-35916c9-2e8f01. No unique authored DOM source needs salvage adoption; foreign snapshot paths/index preserved, no duplicate landing or corpus adoption. Runtime lane remains separate and active under t-mvnc3bb5-1t20, exact app buildwaitw-36438c and bounded compiler repair p112283.
