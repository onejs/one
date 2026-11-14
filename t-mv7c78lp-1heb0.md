---
id: t-mv7c78lp-1heb0
title: Bound generated SwiftUI CI job runtime
status: done
owner_status:
  state: landed
  text: RAN main job 115612988082 enforced the cap; GitHub annotation says maximum execution time of 1h0m0s exceeded.
  updated_at: 1792033860923
assignees:
- p86663
labels:
- followup:production
- lane:one-bindings-timeout
- umbrella:one-ci-owner
backend: git
created_at: 1791935618893
updated_at: 1792033860924
field_marks:
  active_form: 1791935618893
  assigned:p84963: 1791935696399
  assigned:p86466: 1792033207434
  assigned:p86663: 1792033742981
  assigned:s37966: 1791935969366
  body: 1792033860924
  claim: 1791935618893
  evidence_summary: 1791935618893
  owner_status: 1792033860924
  parent: 1791935618893
  priority: 1791935618893
  recovery_ref: 1791935618893
  status: 1792033860924
  title: 1791935618893
  unassigned:p84963: 1792033742981
  unassigned:p86466: 1792033742981
  unassigned:s37966: 1792033207434
---
Coordinator direction: bound Generated SwiftUI bindings job in .github/workflows/test-native-ios.yml with job timeout-minutes on branch PR. RAN run38451529383 job115483375940 xcode-27/GitHub Actions active192.8min; only active xcode-27 job over1h in30-run snapshot. CI owner s37966. REVIEW none. No test timeout changes, retries, skips or main landing authority.

Worker p84963 on pro128 owns narrow60min job cap plus exact job-start watcher missing from repository (needed for mandated build-start wait). Existing Team Machine checkout ff sync refused divergence; left untouched, no new edit there. RAN cancellation38451529383 accepted; only job over60min in snapshot. Current main bindings47min at snapshot, both builds queued.

PR https://github.com/onejs/one/pull/853 opened from tm/bindings-timeout (9dd4aab57b workflow cap, c98cb41df7 watcher script); branch clean and pushed at origin/main tip 73915422b0. actionlint shows only pre-existing runner-label notes; YAML probe proves job-level 60min cap; watcher probes pass from mocked gh JSON. REVIEW none per lane. Delivery stays open under s37966 until landed: merge needs Nate's word for One main; s37966 arms the one exact build-start watch on run 38463413168.

REPORTED worker validation: YAML job-level60 only on generated-swiftui, actionlint no new findings; watcher queued-negative, started-positive, partial wait and exact-name probes passed; oxlint/oxfmt clean. Source commits9dd4aab57b/c98cb41df7, PR853. Parent fetching committed watcher to arm mandated wait; delivery stays open.

Nate direct inbox answer verified: Merge PR853. PR headc98cb41df771ec2f2a45f3257b5f72b5b9fd9325 mergeable; Checks and Tests run38487472571 still active. Requested squash auto-merge for exact head, subject to required checks; delivery task remains open until landed and CI verified.

RAN required branch Checks and Tests38487472571 passed via w-12a04b. Exact-head squash auto-merge already authorized by Nate. Checking actual merged state and covering main CI before task closure.

RAN PR853 merged00:21:59Z at74203bee46ee3bae7cd71db12313abca1bac8115. Hourly generated-bindings cap is on main. New main Checks38489759530, iOS38489759569, Release38489759516 and Deploy website38489759539 started/pending. Prior main uncapped bindings77.6min and localization38482008694 bindings69.3min exceeded coordinator hour limit; cancellation requests accepted. Prior main build-start wait superseded and cancelled.

RAN covering main Checks success, website deploy success; iOS still queued so hourly cap execution not yet observed. Delivery stays open pending terminal native CI.

CI ownership transferred to fleet router ci-manager (p86466); native source/acceptance implementation remains with m32754, determinism consumer with lane owner s38154. Fully-green repair branch38660753431 at4f18b2e2; merged2a8edb960. Current-main acceptance pending; no claim of artifact publication. Handoff: /Users/n8/.team-machine/results/one-ci-owner-winddown.md.

Team Machine moved this task to p86663: every assignee (p84963, p86466) had ended.

RAN 2026-10-15: main iOS run 38489759569 at merge 74203bee46ee3bae7cd71db12313abca1bac8115 is terminal. Generated SwiftUI bindings job 115612988082 concluded cancelled; its GitHub check annotation explicitly reports: The job has exceeded the maximum execution time of 1h0m0s. This directly proves the requested job cap executes on main. Both app builds and all four native test jobs succeeded. Saved log-failed once to /tmp/ci-router-one-38489759569-failed.log (empty for this cancellation); fetched check annotations for the termination reason. Closing the runtime-bound task only. Generated fixture acceptance did not pass in this historical run and remains a separate native acceptance concern, already tracked by the transferred main CI task and later repair evidence. No new rerun, source edit, merge or push. Further optimization: reduce native consumer compilation and UI-test preparation time within the existing native CI lane; cap enforcement itself needs no change.
