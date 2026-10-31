# native input proof

Use the existing fixture's `macos-input-upper`, `macos-input-secure` and
`macos-input-multiline` fields. The uppercase field must still turn mixed case
input into uppercase and stop at eight UTF-16 units. Use an inactive owned app
and the existing host inspection and bitmap capture commands.

For native editor checks, instantiate the actual
`OneMacosTextInputComponentView` with TextInputProps and focus it in an NSWindow.
Exercise its real AppKit field editor, secure field editor and multiline view.
Use both `insertText:replacementRange:` and a unique pasteboard through
`readSelectionFromPasteboard:type:`. The latter is AppKit's plaintext paste
route and does not call `insertText` itself.

With a four-unit limit, `ab` plus `🌊Z` must become `ab🌊`; `abc` plus `éZ`
and `ab` plus `👩‍💻Z` must keep the original text. Replacing the middle two
units of `abcd` with `🌊Z` must produce `a🌊d`, preserving its suffix. Check
undo and redo with the normal field and multiline view; preserve AppKit's secure
editor behavior. A zero limit must reject new text.

Use `setMarkedText:selectedRange:replacementRange:` in the normal field and
multiline view to compose text beyond the limit. The marked text must remain
intact. Committing with `insertText` or `unmarkText` must enforce the limit
without splitting a composed sequence. Undo must restore the precomposition
text. Save native-density captures and the exact executable, archive, source
and loaded fixture bundle hashes outside the worktree. These are focused native
runtime probes, not a new automated test suite.
