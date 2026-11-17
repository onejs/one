---
id: t-mva0kowg-26u0
title: Preserve native module defaults for external CJS imports
status: done
owner_status:
  state: landed
  text: PR921 reviewed by independent large family and squash merged83e15b21f; publication remains existing ci-manager followup
  updated_at: 1792119579211
assignees:
- m36179
labels:
- branch:tm/forge-native-interop
- lane:metro-to-one
backend: git
created_at: 1792097489680
updated_at: 1792119579211
field_marks:
  active_form: 1792097489680
  assigned:m34592: 1792097885519
  assigned:m36179: 1792119428630
  body: 1792119579211
  claim: 1792097489680
  evidence_summary: 1792097489680
  owner_status: 1792119579211
  parent: 1792097489680
  priority: 1792097489680
  recovery_ref: 1792097489680
  status: 1792119579211
  title: 1792097489680
  unassigned:m34592: 1792119428630
---
Parent hands-on upstream One bug fix from real Forge review. RAN actual One-built RN Platform namespace has __esModule/default; actual Forge registry returning the upstream module fixes raw require.default but guest ESM default resolves to namespace because generated external __toESM(variable,1) bypasses existing normalizeNativeCommonJSInterop. Current normalizer only handles bundled require helpers and HMR calls. Preserve upstream RN module shape and fix existing native interop owner, no simulator/package shim, posthoc output normalization outside owning existing pass, weakened identity assertions or public API feature. Prove failure before and success after with ESM/raw identity and existing bundled/HMR contracts; exercise local release --into isolated Contrast tree. Branch+PR, no main merge or stable release. ci-manager owns CI/publication; large independent review before upstream merge remains. Parent m34592 owns this work; no helper assigned.

RAN: One worktree clean source switched from preserved origin/tm/soak-rn-current to new tm/forge-native-interop at origin/main after fetch. Added existing-owning-suite controls: external Babel namespace, scoped deep external, plain CommonJS callable and raw require namespace identity in minified/unminified CJS output. Baseline running before changing normalizer. Contrast direct real-module registry repair remains uncommitted and failed ESM identity as expected; no fake namespace or Platform mutation introduced.

RAN: both new production cases fail before fix with external default resolving to namespace instead of function, plain CommonJS and raw namespace unaffected. Extending existing native CommonJS interop owner to external binding identifiers makes all5conditional-export controls pass (bundled prod/dev plus scoped/unscoped external minified/unminified). Added strict raw namespace identity assertion and formatted changed source. Running final owning suite/lint and local release--into actual Forge tree, then unchanged actual RN namespace and resolver controls. No upstream merge/publication or Contrast commit yet.

RAN final source be680d63a committed/pushed origin/tm/forge-native-interop; draft PR https://github.com/onejs/one/pull/921 opened. Full116owningtests, focusedlint0, local17family release into isolatedForge and actual RN namespace/default/root/raw identity plus resolver/auth refusals passed. Both new minified/unminified runtime cases failed before fix. Required large independent review requested once from coordinator because parent medium cannot staff above tier; no upstream merge/stable release. Branch canary verification ci-manager t-mva0r6x5-c3n0. Contrast draft436b7219943 cannot land before containing published One; rootpin unchanged.

RAN independent large contributor review m35892 approved exact PR921 head be680d63a9a773fdcc18d9595c5e73f449ee4a67 with no blocking defects. Reviewer ran five focused owning cases and actual before/after Rolldown VM probes, including plain CJS own-default negative and bundled/HMR shape checks; full116/downstream acceptance remain author evidence. Report /Users/n8/.team-machine/results/one-pr921-large-review.md. PR marked ready; normal squash merge requested with exact-head guard, no admin bypass or stable release. Existing canary workflow38806112172 and p88682 delivery ownership remain unchanged.

RAN PR921 normal exact-head squash merge succeeded; GitHub state and containing main commit verified separately. Large reviewer m35892 completed with approve/no blocking defects and cleaned disposable probes. Existing branch canary artifact verification stays p88682/ci-manager; no second publication or stable release requested.

RAN ownership audit by fix-standing-agent-hijack: reviewer p88876 prompt carried its own launch-id, but idle standing disk p88858 incorrectly claimed its native SQLite log (adb855c7-fcaf-4f5c-96ce-80a2aa88dcf1), causing false attribution and reviewer startup failure. Review conversation backup preserved on pro-128 at ~/.team-machine/results/fix-standing-agent-hijack/review-p88876.db, with ownership.md. Actual disk native thread was separate (46024fb0-9744-4683-b961-4293b36a917c); no review source or worktree changed or removed. Completed replacement m35892 verdict remains the authoritative review. Source repair tracked in Team Machine task t-mvaba3if-6v30.

RAN successor verified merged83e15b21f is ancestor of current origin/main84955bd21. Source fix and independent review acceptance are complete; containing published artifact verification remains canonical Contrast t-mva0r6x5-c3n0. Installed One2.7.6 source844022ded predates repair and cannot clear that dependency. No duplicate publication or stable release.
