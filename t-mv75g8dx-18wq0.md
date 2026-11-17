---
id: t-mv75g8dx-18wq0
title: Deploy and verify updated One website
status: done
owner_status:
  state: landed
  text: TESTED deploy38463413003 success; both public domains serve v2 blog/native docs and browser navigation without errors
  updated_at: 1791924959051
labels:
- lane:oss-fixer
- umbrella:plans/contrast/takeout-lime-sync.md
backend: git
sessions:
- p84640
created_at: 1791924281205
updated_at: 1791988547799
field_marks:
  active_form: 1791924281205
  body: 1791925251368
  claim: 1791988547799
  evidence_summary: 1791924281205
  owner_status: 1791924959060
  parent: 1791924281205
  priority: 1791924281205
  recovery_ref: 1791924281205
  status: 1791924959053
  title: 1791924281205
---
Nate directly requested updated One site delivery after the old onestack.dev merge share. Spec plans/contrast/takeout-lime-sync.md, goals row18. Existing website author s37966 owns PR841 Cloudflare deployment automation/obsolete Railway retirement and was asked once for concrete blocker; no takeover of authored landing. Parent oss-fixer verifies live site and unblocks within approved scope. PR839/842 content/style are outside standing bug-fix authority. CI owner author for841, oss-fixer for own changes and final integration.

RAN production Playwright on onestack.dev and v2.onestack.dev: home/docs navigation/native-apis/version-two blog pass, no TestFlight links, page errors []. CI deploy run38463413003 source73915422b0 success. Evidence /tmp/oss-fixer-one-production.log and 3x WebP /tmp/oss-fixer-one-updated-live.webp. Deployment author s37966 owns obsolete Railway cleanup separately.

2026-10-13 Nate: "I approve this shared item" for both "One v2 blog on the live site" (share-file-p84640-92c79b3faf4b455a-1a1370d619e-83244853283fbbe4) and "Updated One site is live" (share-url-p84640-d6adc0d58e4427e0-1a1370d6035-18753cb1f826b96c). Approval recorded; both already live and verified.
