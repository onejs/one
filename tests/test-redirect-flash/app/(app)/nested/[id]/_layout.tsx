import { Slot } from 'one'

// intermediate passthrough layout — mirrors soot's
// app/(app)/project/[projectId]/_layout.tsx. this is the layout whose
// contextKey contains a dynamic segment (/nested/[id]), which used to
// break the late-mount initialRouteName resolver: stripping the literal
// string "/nested/[id]" from "/nested/foo" failed, leaving the navigator
// to pick [sub] over index as its best-scoring screen.
export default () => <Slot />
