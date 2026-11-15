# App commands fixture

`AppCommandsProbe` in `app/index.tsx` configures `One.macOS.AppCommands` with
fixture commands. `app-commands-result` shows the root's random tag and one
counter per command.

Build and launch an owned app copy as in `CONTROLS.md`, with
`ONE_MACOS_DEBUG_DIR` outside `/Volumes`. Drive it in the background: press
menu items through AX (`AXPress` on the item, not a foreground menu driver)
and post keys with `CGEvent.postToPid`.

1. Press App > Ping, Fixture > Count, Fixture > More > Arrow, View > Fixture
   View and Fixture > Root. Each press must add exactly one.
2. Post cmd-shift-[, cmd-alt-k, cmd-shift-9 (hidden), up, ctrl-tab,
   ctrl-shift-tab, tab, shift-tab, then ctrl-tab again. Each must add one.
3. Remove listener. The fixture items must be disabled, and a press or key
   must add nothing. Add listener, and one press must add one.
4. Configure invalid. The error must name the binding, and the fixture menus,
   Edit, Window and Services must remain.
5. Reload host. While the new runtime loads the menu must have no fixture
   items. Afterwards the tag changes, counts reset and one press adds one.
6. Open File > New Window. Set AXMain on each window in turn and press Ping
   and ctrl-tab. Only the main window's root may count them.

After every step the app must stay inactive and the cursor must not move.
Save review images as WebP with the loaded bundle and app hashes. These are
manual runtime checks, not automated UI tests.
