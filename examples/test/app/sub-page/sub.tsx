import { Logo } from '~/features/brand/Logo'
import { testData } from '~/features/feed/testData'
import { ToggleThemeButton } from '~/features/theme/ToggleThemeButton'

export function loader() {
  return testData
}

export default function Test() {
  return (
    <>
      <Logo />
      <ToggleThemeButton />
    </>
  )
}
