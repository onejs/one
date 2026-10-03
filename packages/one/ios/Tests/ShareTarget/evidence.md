# iOS ShareTarget runtime validation — s5624

Validated on `v2-beta`, starting from `74619b489`. Scope is only
`packages/one/ios/ShareTarget` and `packages/one/ios/Tests/ShareTarget`.
No JS, configuration schema, Nitro, Podspec, release, or main changes.
The adapter/submission contract and system `SLComposeServiceViewController`,
attachment preview, configuration row, and pushed native picker remain.

This report supersedes the preceding report's lifecycle and automation
claims. Its share-menu screenshots proved registration, not activation.
Its direct `persistNow()` tests did not establish write ordering, and the
assertion that removing cancel awaits failed both terminal-guard tests was
unsupported. Those guard-only tests and timing sleeps have been removed.
We do not claim every current test was individually negative-controlled.

## Runtime failures reproduced before fixes

`UIHarness/evidence/baseline-tests.txt`: the first four new runtime probes
ran against the original sources. The run executed 28 tests and recorded
six assertion failures: edited caption still present in `items`, unbounded
caption intake, silently rejected caption type, blank incoming-text editor,
and aggregate-budget failure/send reaching the adapter. Existing tests
passed despite these bugs.

Further real extension interaction found the system exposing the caption
both as attributed text and a provider. `before-caption.webp` and
`before-caption-draft.json` capture the doubled editor/draft before that
correction, during this session's initial implementation pass. They are
not represented as an untouched original-revision screenshot.
`before-send-auto-dismiss.webp` captures the native sheet disappearing
while the harness adapter's send event was held, before button routing was
corrected.

## Source corrections

- Intake validates accompanying text type, count, per-item and aggregate
  bytes. Identical attributed/provider caption metadata consumes one item;
  distinct text remains. Plain-text intake becomes editable initial content.
  Text appears only in the edited submission field, once. URLs remain typed
  items and retain the native system preview.
- Edited text shares the residual aggregate budget with URL/file items and
  counts as an item. `send()` enforces native `isSendable`; UI enablement is
  not the final authority.
- Loading accepts edits and never replaces them with intake text. UIKit
  orders edit callbacks and checks its edit flag after awaiting prepared text.
- Every durable snapshot joins a serial write queue. Send saves the exact
  submitted snapshot before invoking the adapter. Send/cancel block mutations;
  terminal deletion awaits pending writes. Unknown/failed adapter outcomes persist `pendingDelivery` and freeze
  exact text/items/destination/ID through retry and cold recovery; edits,
  destination changes, and cancellation are refused. Store deletion errors do not report successful cancellation or
  invite resending an already accepted submission.
- Destination loading races a one-shot cancellation event. Cancellation can
  complete even if the adapter ignores cancellation. Provider intake/copy is
  still awaited before directory deletion. Destination failure can retry
  without recopying or changing identity. Reopening a coordinator with its
  saved submission ID uses the real stored draft and selected destination.
- Native configuration items exist before asynchronous loading starts. The
  existing native Post/Cancel bar items route directly to coordinator actions:
  SL's default Post action otherwise hides the sheet before delivery resolves,
  preventing useful editing/error recovery. Pending send disables those actual
  hosted controls and the editor; unknown delivery keeps editing/Cancel disabled and restores only Post for
  exact retry, with a saved-share alert and modal dismissal blocked.

## Checks actually run

```
swift test --package-path packages/one/ios/Tests/ShareTarget
bash packages/one/ios/Tests/ShareTarget/UIHarness/build.sh C75DA2BC-721A-491D-A8C4-65943DA33F67
```

**34/34 tests pass** (`after-tests.txt`): real disk save/load/discard, all
accepted representations, count/byte rejection, edited-file residual budget,
suspended save versus send/cancel, held file-provider cancellation, edits
while provider loading, an adapter held beyond cancellation, destination
retry, same-ID failed-send retry, and cold restore of an actual manifest.
Tests use continuations/event gates rather than `Task.sleep` guesses or
calling a terminal guard directly. Internal store/state suspension barriers
are exercised through normal public load/edit/send/cancel actions.

The final harness compiles the actual seven production source files with
Swift 6, `-strict-concurrency=complete`, and `-application-extension`, then
builds/signs/installs the host and real extension. **Exit 0, no warnings**
(`strict-build.txt`). Explicit `xcrun --sdk iphonesimulator` also fixes the
previous toolchain linker SDK warning. No XCUITest appearance suite was added.
The temporary UIKit hierarchy diagnostic was removed; its recorded output
in `configuration-probe.txt` explains the native row/hosted bar investigation.

## Actual extension interaction

Session **s5624** explicitly reclaimed **iPhone 17 Pro / iOS 27**,
`C75DA2BC-721A-491D-A8C4-65943DA33F67`, after s5561 had exited. All commands
use this UDID. No Simulator GUI focus, System Events, permissions change,
untrusted brew tap, or helpers were used.

`xcodebuildmcp ui-automation tap/touch` exposes only element references, but
its already-installed bundled **AXe CLI supports direct coordinate tap**.
Its full-tree snapshot omits remote extension windows on this SDK;
`describe-ui --point x,y` returns their real OS accessibility nodes and PID.
`interact.py` records both the host tree and extension hit tests. Coordinates
were selected from inspected screenshots, not ambiguous share-menu refs.
The harness has an explicit ObjC principal class and Swift module name.
Live extension PIDs, real native AX controls, and app-group manifests prove
activation, beyond the installed share icon. There is no claim that a
principal-class failure was independently reproduced on the prior revision.

All new screenshots are **WebP quality 90**, captured and inspected. Files
below live in `UIHarness/evidence`; each screenshot has a matching `.ax.json`.

| Interaction | Screenshot / AX evidence | Disk or submission proof |
| --- | --- | --- |
| Initial content and URL preview | `final-initial`, `final-loading` | Caption appears once; typed URL remains in manifests |
| Actual native picker, subtitles and selection | `final-picker`, `final-edited` | Personal destination and edited caption in submission receipt |
| Held send, attempted cancel/edit | `final-sending` | AX Cancel/Post both `enabled=false`, PID 38624; `final-sending-disk.json` |
| Accepted send | `final-delivered` | ID `4219DF94-6B0E-428C-A5B9-9053350B0BDB` removed in `final-delivered-disk.json`; accepted receipt contains exactly `Edited native share`, Personal, one URL |
| Send error, dismissal, retry | `final-send-error`, `final-retry-ready` | ID `C34D88D4-7508-4FA0-A9CB-C6FBCEFD9277` present in `final-failed-send-disk.json`, `pendingDelivery=true`; attempted typing, Cancel, and dismissal leave the exact draft unchanged (`final-failed-mutations-blocked-disk.json`); two identical submissions accepted then removed (`final-retry-verification.json`) |
| Destination failure and retry | `final-destination-error`, `final-destination-recovered` | ID `B9EFFE08-7094-4BC9-BDD6-810C10BCF37A` survives; destination changes from nil to team without recopy |
| Cancel recovered compose | `final-cancelled` | That ID is deleted in `final-cancelled-disk.json` |
| Edit during held destination load | `final-load-edit-preserved` | ID `86054DC3-DFF5-424A-8DF4-828463FA193E` retains `Edited while destinations load` in disk and editor after gate release; latest final build |
| Cancel while destinations remain held | `final-held-destinations`, `final-held-destinations-cancelled` | ID `CF886186-3E30-47BE-8C34-37151F98B5CE`, native Cancel enabled/Post disabled; before/after disk exports establish deletion while the adapter's hold flag remains true; latest final build |

Unrelated earlier throwaway harness drafts remain in disk exports; deletion
claims refer to the listed submission IDs, not an empty entire app group.
The native sheet is scrollable on this SDK: a real upward swipe reveals its
configuration row before tapping it. The interaction screenshots show this
system behavior; no custom layout or screenshot assertions replace it.
The latest installed build repeats the unknown-delivery freeze/retry flow.
Earlier successful picker/send/cancel captures precede the pending-delivery
addition; their interaction code remains in the strict final build.
Cold restore of frozen attempted content is tested at the coordinator boundary, not claimed as a new
UIKit pending-draft picker. A new incoming share retains its own new ID.

Harness flags and gates are local app-group files, with atomic control writes,
file-system events, and recorded submission/acceptance receipts. The host's
scenario buttons write those same controls, avoiding cross-process defaults
cache staleness observed during this run. No real Team Machine credentials
or transport are involved. The Team Machine adapter must separately journal
the identical encrypted envelope and upload paths; native submission equality
does not establish ciphertext equality for an adapter that re-encrypts.

Significant UI evidence is shared from **s5624**; the durable JSON receipt is
`UIHarness/evidence/share-receipt.json`. The assembled Team Machine UI gate
belongs to the parent task and is separate from this native extension proof.
