---
id: t-murcewif-b5g0
title: Verify launch preview and review recent Tamagui fixes
status: canceled
labels:
- branch:v3/main-pr-fixes
- branch:v3/responsive-variant-refresh
- lane:one-site-tamagui-v3
- umbrella:plans/launch
backend: git
commits:
- 1a1f7fb2ce3762aa8734ca132e02e01e4331359b
- 1fbd977964a49d5144f4775b6926089503da9dc8
- 2830e2263c
- 5134d83449
- 538601b0665791b17da4f0da8ed445b2a0e95289
- 591c6f123a
- 6012881a654e3c79ca52cde7963fceebe5a60d38
- e2fba9852da8a86516e01a4cd463d3e72ab824fe
created_at: 1790968517655
updated_at: 1793089836584
field_marks:
  active_form: 1790968517655
  body: 1793089836584
  claim: 1790968517655
  evidence_summary: 1790968517655
  owner_status: 1790968517655
  parent: 1790968517655
  priority: 1790968517655
  recovery_ref: 1790968517655
  status: 1793089836584
  title: 1790968517655
---
# Tamagui follow-up, owner-blocked

Task t-murcewif-b5g0, lane one-site-tamagui-v3, umbrella plans/launch. Original site migration finished once. Follow-up source work is published and verified; Railway logs and main merges need an owner.

RAN: responsive fix landed on v3-beta at e2fba9852da8a86516e01a4cd463d3e72ab824fe and shipped as3.0.0-beta.1551.1. Seven package beta tags align. Release37097957761 success; forced browser+SSR Checks37097005227 success. npm web/Sheet source byte-match tested e2. Published ESM runtime keeps weight300 in both media states with responsive size12/30 and one CSS weight300 rule. Sheet early portal return present in ESM,CJS,native. Receipts /tmp/tamagui-beta-1551-evidence/{content-receipt.json,dist-tags.json,responsive-runtime-probe.log}; tgz files retained. Negative control published1546 repros600, positive1551 fixes300, script /tmp/tamagui-beta-1546-evidence/responsive-runtime-probe.mjs (package-root,expected-weight args).

Source branch v3/responsive-variant-refresh clean/pushed at e2 in owned /Users/n8/.worktrees/tamagui-source-v3-main-pr-fixes. Own commits1a1f7fb2ce source precedence fix,6012881a65 shared slot writer removes duplicated code to meet unchanged size gates,e2fba9852d awaited fixture setup keeps original runtime assertions/timeouts. Root lint/check/types/build passed;676 web/416 native verified. Styled-view29867<=29926; starter Vite73288/Next73290/Metro124000 pass unchanged limits. All original25 source checks terminal22 success/3 feature-branch skips, including five iOS Detox jobs,Android,Maestro. New v3-beta Checks runs actual integrations+SSR and passed.

RAN: all 84 checks at e2 are terminal with no failures. Last Android Detox job111134057696 in run37097005342 succeeded at05:35:59Z. Forced browser/SSR suites passed. Watcher w-00a0 expired while repeated native runs continued; beta had already shipped. No pending CI or repeat release needed. Auto-publishing retained; release.yml unchanged.

Earlier v3/main-pr-fixes538601b066 landed, beta1546 source/dist verified. PR4242 Slider alreadyv3;PR4243 Sheet shipped1546+1551. Both legitimate, red-first and independent review approved. PRs remainOPEN as of05:32Z; main merges remain Nate/eligible-Claude owned. No main push/stable release.

Preview https://tamagui-tamagui-pr-4231.up.railway.app. New e2 deployment e5d29292-6c18-43ea-a510-dfec25e69032 FAILED at04:37Z. Log link https://railway.com/project/e0ff22cb-e629-4371-91c1-90743e2a036f/service/c14f5c41-a8f8-4046-baae-e7dbe1569976?id=e5d29292-6c18-43ea-a510-dfec25e69032&environmentId=854c748d-2301-4323-9972-70c9a4deb6e6 . CLI unauthorized air24/pro64; failed log needed, already requested once. Do not authenticate without permission or claim preview serves e2. Proven Docker Bun correction shipped; actual Railway cause unconfirmed.

Portal plugin tm/one-portal-setup9230f0bb3d separate public API owned m18635; site-claims m18637-owned, untouched. Original site v2-site-tamagui-v3 at258ecb0e2330 left unmerged for measured pixel differences. Preserve old handoff one-site-tamagui-v3.md and /tmp/one-site-v3-evidence. RAN: owned install/build outputs removed after validation (274 ignored paths, 2.827 GiB allocated). Disk free rose28.972 to31.436 GiB. Source stays clean; tarball/receipt hashes and visual evidence preserved. No active hold. Runtime probe rerun requires reinstall. Exact paths and sizes: /tmp/tamagui-owned-cleanup-20261003.json. Next: read failed Railway build logs when supplied, fix the confirmed cause on a branch, and leave main PR merges to Nate or his eligible Claude session. No auth or main push by this runner.

RAN: obsolete Oct1 codemod wrappers53072/54931 and install children53290/54971 exited after SIGTERM on Oct3 15:52Z. Source clean, visual proofs preserved. Install stall cause unconfirmed. Receipt /tmp/one-v3-codemod-process-retirement-20261003.json.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-murcewif-b5g0 --status open`.
