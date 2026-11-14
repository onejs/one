---
id: t-mv78hj20-poh0
title: Stub One CameraView capture contract in Peach
status: canceled
assignees:
- r89484
labels:
- lane:one-peach-contrast-e2e
- umbrella:plans/contrast/mobile-app/one-native-parity.md
backend: git
created_at: 1791929380536
updated_at: 1793089884745
field_marks:
  active_form: 1791929380536
  body: 1793089884745
  claim: 1791929380536
  evidence_summary: 1791929380536
  owner_status: 1791929380536
  parent: 1791929380536
  priority: 1791929380536
  recovery_ref: 1791929380536
  status: 1793089884745
  title: 1791929380536
---
One native parity PR onejs/one#845 adds CameraView capture: props flash ('off'|'on'|'auto'), enableTorch, zoom (0..1 linear), and ref.takePicture({quality 0..1, base64}) -> {uri, width, height, format:'jpg', base64?}. Native view command takePicture(viewRef, requestId, quality, base64) answers via event onNativeCameraPicture{requestId,uri,width,height,base64,error}; error is 'E_CODE: message' with E_CAMERA_NOT_READY, E_CAMERA_INACTIVE, E_CAMERA_CAPTURE; JS rejects pending requests with E_CAMERA_UNMOUNTED. Peach stub supplies only the native side (command + event, no JS), matching the spec in packages/one/specs/OneNativeCameraNativeComponent.ts once #845 merges. Search for an existing CameraView stub and extend it.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv78hj20-poh0 --status open`.
