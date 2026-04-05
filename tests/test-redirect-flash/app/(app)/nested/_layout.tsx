import { Slot } from 'one'

// intermediate passthrough layout — mirrors soot's app/(app)/project/_layout.tsx.
// having a _layout at this level creates its own navigator tier rather than
// hoisting children up to (app), which exercises a different code path in
// Navigator's initialRouteName resolver (the one with a dynamic-segment
// parent layout path, e.g. /nested/[id]).
export default () => <Slot />
