import { LoadProgressBar, Slot } from 'one'

export default function Layout() {
  return (
    <>
      <LoadProgressBar />
      <Slot />
    </>
  )
}
