Write one fixture page for the One Native test app in the worktree /Users/n8/.worktrees/one-native
(branch feat/one-native). Work only in that worktree. Do not touch ~/one.

REVIEW: none - reviewed as part of the assembled one-native foundation.

You do NOT own: anything under packages/one-native, anything under
tests/native-features/scripts, the iOS project, pods, the simulator, or git. Do not
build, do not run pod install, do not run any simulator or xcodebuild command, do not
commit, do not push. Another agent (me) owns all of that and is working in the same
worktree right now.

## What to write

Three files, following the existing pattern exactly:

1. `tests/native-features/fixtures/one-native-popover.tsx` (new)
2. `tests/native-features/app/one-native-popover.tsx` (new, one line, copy the shape of
   `app/one-native-containers.tsx`)
3. `tests/native-features/app/index.tsx`: add a nav entry
   `{ href: '/one-native-popover', label: 'One Native Popover', testID: 'nav-one-native-popover' }`
   immediately after the `one-native-containers` entry.

Read `tests/native-features/fixtures/one-native-containers.tsx` first and match its
style: a StyleSheet at the bottom, lowercase comments only where they earn their place,
no extra abstractions, no helper components.

## The API you are using

`Swift.Popover` is new in `one-native` (already generated and typed, import
`{ Swift } from 'one-native'`). Props:

- `isPresented: boolean` and `onIsPresentedChange: (value: boolean) => void` (controlled)
- `contentWidth: number`, `contentHeight: number` (both required, positive)
- `content: ReactNode` - the React Native subtree the popover presents
- `children` - the trigger, which must be One Native content (a `Swift.Button` etc.)
- `arrowEdge?: 'top' | 'leading' | 'bottom' | 'trailing'`
- `presentationCompactAdaptation?: 'automatic' | 'none' | 'popover' | 'sheet' | 'fullScreenCover'`
  (defaults to 'automatic', which on an iPhone shows the body as a sheet)
- ordinary ViewProps including `style`, `testID` and `onLayout`

The trigger reports the height SwiftUI measured back to React Native, so never give the
popover a height in style.

## The fixture

Default export `OneNativePopover`, screen `<View testID="one-native-popover-screen">`
with `{ flex: 1, padding: 16, paddingTop: 70, gap: 8, backgroundColor: '#fff' }`.

State: `open` (boolean), `sectionOpen` (boolean), `taps` (number), `height` (number).

Contents, in order:

1. A row of two `Pressable` chips (same chip styles as the containers fixture):
   - `testID="one-native-popover-open"`, label `Open`, sets `open` to true.
   - `testID="one-native-popover-section-open"`, label `Open in section`, sets
     `sectionOpen` to true.

2. A standalone popover:
   ```tsx
   <Swift.Popover
     testID="one-native-popover-trigger"
     isPresented={open}
     onIsPresentedChange={setOpen}
     arrowEdge="top"
     presentationCompactAdaptation="popover"
     contentWidth={260}
     contentHeight={160}
     onLayout={({ nativeEvent }) => setHeight(Math.round(nativeEvent.layout.height))}
     content={ ... }
   >
     <Swift.Button label="Trigger" onPress={() => setOpen(true)} />
   </Swift.Popover>
   ```
   The `content` is a plain React Native subtree:
   `<View style={styles.body}>` containing
   - `<Text testID="one-native-popover-body">Popover body</Text>`
   - `<Pressable testID="one-native-popover-tap" style={styles.action}><Text>Tap me</Text></Pressable>`
     which increments `taps`
   - `<Pressable testID="one-native-popover-close" style={styles.action}><Text>Close</Text></Pressable>`
     which sets `open` to false

3. A `Swift.Form style={styles.form /* flex: 1 */}` containing a
   `Swift.Section title="Row"` with, in order:
   - `<Swift.Text text="Section row" />`
   - a second `Swift.Popover` composed inside the section:
     `testID="one-native-popover-section"`, `isPresented={sectionOpen}`,
     `onIsPresentedChange={setSectionOpen}`, `contentWidth={240}`, `contentHeight={120}`,
     no `arrowEdge` and no `presentationCompactAdaptation` (so it takes the default),
     trigger `<Swift.Button label="Section trigger" onPress={() => setSectionOpen(true)} />`,
     content a `<View style={styles.body}>` holding
     `<Text testID="one-native-popover-section-body">Section body</Text>`.

4. A row (`flexDirection: 'row'`, `flexWrap: 'wrap'`, gap 8) of three status Texts, each
   `fontSize: 14`:
   - `testID="one-native-popover-state"` reading `` `Open: ${open}` ``
   - `testID="one-native-popover-taps"` reading `` `Taps: ${taps}` ``
   - `testID="one-native-popover-height"` reading `` `Trigger: ${height}` ``

   Keep this row compact: it sits below a flex Form and the Form must keep most of the
   screen.

## Checks before you report

- `cd /Users/n8/.worktrees/one-native/tests/native-features && bunx tsc --noEmit` (or
  whatever the app's typecheck script is; read package.json, do not guess). The only
  error you may leave is the pre-existing `TS2868: Cannot find name 'Bun'`. Anything
  else is yours to fix.
- No lines over 90 columns.
- Do not run anything else.

Report back in one message: the three file paths and the typecheck result. Nothing else.
