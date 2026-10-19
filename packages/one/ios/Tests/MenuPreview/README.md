# MenuPreview native ownership regression

This SwiftPM harness compiles the production `OneNativeMenuPreviewSession.swift`
through a source symlink. Only the content/host/animator stand-ins are fakes;
the session under test is the real ownership state machine behind
`OneNativeMenuView`'s context menu preview.

```sh
tm window run heavy -- swift test --package-path packages/one/ios/Tests/MenuPreview
```

Tests cover normal dismissal detach/hide/host release, nil-animator inline
cleanup, mid-presentation replacement joining the live host, recycle-before-
dismissal-completion leaving the successor intact (P2-1), rapid re-present
superseding the old completion (P2-1), live resize updating the host and
keeping content visible (P2-2), and presentation requiring mounted content
with a positive box.

The harness proves session ownership logic, not real UIKit/Fabric timing or
the marker's hidden flag, which the menu-preview simulator suite covers with
its open-menu resize control.
