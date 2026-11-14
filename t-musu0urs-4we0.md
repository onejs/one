---
id: t-musu0urs-4we0
title: Make One.UI.Image honor borderRadius on Android
status: canceled
labels:
- image
- native
backend: git
created_at: 1791058561480
updated_at: 1793089836153
field_marks:
  active_form: 1791058561480
  body: 1793089836153
  claim: 1791058561480
  evidence_summary: 1791058561480
  owner_status: 1791058561480
  parent: 1791058561480
  priority: 1791058561480
  recovery_ref: 1791058561480
  status: 1793089836153
  title: 1791058561480
---
Seen on the ci-64 Android 17 emulator during the Image docs capture: One.UI.Image with style borderRadius draws square corners on Android; iOS clips. The Nitro Image HybridView doesn't get Fabric's border clipping. Fix in packages/one/src/platform/ui/Image.native.tsx or upstream react-native-nitro-image. apps/onestack.dev/data/native/image.mdx tells people to wrap in a View with overflow hidden; remove that note once fixed.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-musu0urs-4we0 --status open`.
