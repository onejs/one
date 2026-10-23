# AppKit controls fixture

The `native-controls` section in `app/index.tsx` exercises the public
`One.macOS.Button` and `One.macOS.SegmentedControl` API through Fabric.

Build the MacosBasic target with its own derived data directory. Start the
fixture with `bun run dev --port 8098`. Set `OneDevServerURL` in an owned app
copy, or launch with `ONE_MACOS_BUNDLE_URL` pointing to that server. Set
`ONE_MACOS_DEBUG_DIR` for app-owned bitmap captures and existing inspect hooks.

The same controls render without the router from `probe/controls-entry.tsx`,
for a production bundle loaded through `ONE_MACOS_BUNDLE_URL`.

Use CuaDriver on the exact fixture PID and window, with background AX actions:

1. Press New pane and select Shares. `native-result` must report one press,
   selection 1, and one change. The AX tree must contain an NSButton and the
   segmented control's native radio buttons.
2. Press Select Flags. React must select index 2 without another change event.
3. Turn on Reject selection, then select Asks. Changes must increase once, but
   selection must return to Flags after React acknowledges the event.
4. Disable controls. Attempts to press New pane or select another segment must
   not change the counters or selected value. Reenable and repeat the action.
5. Press Borderless action. New pane must remain an AX button with its title,
   symbol and one event per press, and the capture must show no bezel. Disable
   it while borderless, then press Bordered action; the bezel must return.
6. Unmount and mount controls. React state must survive, native controls must
   return with the accepted selection, and one action must produce one event.
7. Reload host, then interact again. State must reset and callbacks must fire
   once, with no retained targets from the previous surface.

Record the native AX selected/disabled values alongside `native-result` and
check that the window remains inactive and the hardware cursor does not move.
Capture both the normal and disabled interface. Save review images as WebP,
with the exact loaded bundle and app hashes beside them. These are manual
runtime checks, not automated UI tests.
