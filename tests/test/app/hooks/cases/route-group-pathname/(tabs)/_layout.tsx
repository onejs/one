import { Slot, usePathname } from 'one'

export default function TabsLayout() {
  const pathname = usePathname()

  return (
    <>
      <div id="group-tabs-pathname">{pathname}</div>
      <Slot />
    </>
  )
}
