---
id: t-mvj86ctu-1fv90
title: Diagnose exact registry cache miss transport failure
status: done
labels:
- one-registry-cache-miss
- upstream-release
backend: git
sessions:
- r117243
commits:
- 162c8c314bac55e290e55d3effc763ae780bb520
created_at: 1792654453362
updated_at: 1792654603394
field_marks:
  active_form: 1792654453362
  body: 1792654603394
  claim: 1792654453362
  commit_linked:162c8c314bac55e290e55d3effc763ae780bb520: 1792654461241
  evidence_summary: 1792654453362
  owner_status: 1792654453362
  parent: 1792654453362
  priority: 1792654453362
  recovery_ref: 1792654453362
  status: 1792654603394
  title: 1792654453362
---
Parent p103481; Contrast t-mvj84j53-1rs10; CI p96184. Diagnose actual canary 39740435695 preflight failure at source 162c8c314b. Preserve reviewed publisher #1009 and SDK sources. Bounded real transport proof; no publication, dispatch, builds, or retry budget increase. Review owner p103481.

Diagnosis complete, no source mutation or PR. TESTED real curl matrix and Bun1.4.2/Node24.22.1 controls contradict a deterministic query/header or Bun-only cause. Exact occupied2.9.2 also timed out15s, then unchanged publisher recovered with200; missing target likewise15s then404. TLS completes around0.04s on stalled curl requests. INFERRED intermittent exact-document response stall beyond TLS; CDN/origin layer unknown. Required external condition: registry exact-document transport meets existing15s/read,3-read budget, or response-level trace identifies actionable cause. Parent p103481 retains unresolved transport task t-mvj84j53-1rs10 and CI p96184. TESTED existing focused checks35pass/0fail. Evidence retained outside worktree at /Users/n8/.team-machine/evidence/registry-transport-r117243. Reviewed publisher117168/#1009 and all SDK/native sources unchanged. No publication, dispatch, build, helpers, services or resource claims.
