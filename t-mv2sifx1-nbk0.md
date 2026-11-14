---
id: t-mv2sifx1-nbk0
title: 'One v2 launch readiness: iOS CI, blog, release dry-run'
status: done
assignees:
- s29025
labels:
- lane:one-v2
- umbrella:one-v2
backend: git
created_at: 1791660684565
updated_at: 1791668338119
field_marks:
  active_form: 1791660684565
  body: 1791668338119
  claim: 1791660684565
  evidence_summary: 1791660684565
  owner_status: 1791660684565
  parent: 1791660684565
  priority: 1791660684565
  recovery_ref: 1791660684565
  status: 1791668338081
  title: 1791660684565
---
Owner s29025 (one-v2-launch). Branch v2-beta. 1 iOS Native Tests red on 7547a2dc1: RAN log shows Build Succeeded then upload-artifact ENOTFOUND (runner network); reran failed job. 2 blog version-two.mdx headline sections. 3 release dry-run. 4 t-mv2r74xy-1byv0 stale hash.

RAN 2026-10-10: (1) iOS red on 7547a2dc1 = upload-artifact ENOTFOUND after Build Succeeded; rerun superseded; iOS Native Tests on eca3d5732 in progress (wait w-b62ebd). (2) blog 8f61e350c: approved stable post + Swift/Kotlin import headline section, blog column width fix; rendered 390/1440 no errors. (3) canary 2.0.0-0.canary.1791637565512 tarballs verified; --major selects 2.6.0 (legacy npm one 2.5.2); PR #795 refreshed to v2-beta 7629aa0b1 + v2.6.0 (4d3b750f0). Owner quotes moved out of public plans (eca3d5732, 7629aa0b1) so the main-bound push passes the guard. (4) t-mv2r74xy-1byv0 fixed 667de4dec. Open: Swift protocol naming PeachModule/PeachPackage vs Kotlin OneModule; swift-views merge; both asked of s27975.

s27975 reply 19:54Z: swift-views waits on Nate's OK (shared to him, unanswered); no rename planned, naming is Nate's call. Asked Nate via tm ask (Swift protocol naming for Monday).

Closed: iOS Native Tests green on eca3d5732 (38080400239). PR #795 at 36382eb3a (v2-beta b6364ccff + v2.6.0) Checks green (38086843568) after two v2-beta test fixes: 7eba692ad packed closure installs local tarballs; b6364ccff polyfill test babel warmup out of timed body. Checklist shared to Nate. Open with Nate: 2.6.0, Swift protocol naming (tm ask i-1791662958108-94895-0), swift-views OK, new blog section read, then merge #795 + republish.
