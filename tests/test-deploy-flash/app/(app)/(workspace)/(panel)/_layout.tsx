import { Slot, usePathname } from 'one'

export default function PanelGroupLayout() {
  const pathname = usePathname()

  return (
    <div id="panel-group-layout" data-pathname={pathname}>
      <Slot />
    </div>
  )
}
