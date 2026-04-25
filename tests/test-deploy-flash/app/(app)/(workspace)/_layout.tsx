import { Slot, usePathname } from 'one'

export default function WorkspaceGroupLayout() {
  const pathname = usePathname()

  return (
    <div id="workspace-group-layout" data-pathname={pathname}>
      <Slot />
    </div>
  )
}
