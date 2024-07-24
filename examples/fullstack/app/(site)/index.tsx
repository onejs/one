import { H1 } from 'tamagui'
import { useLoader } from 'vxs'
import { HeadInfo } from '~/components/HeadInfo'

export async function loader() {
  return {
    hello: 'world',
  }
}

export default function TamaguiHomePage() {
  const { hello } = useLoader(loader)

  return (
    <>
      <HeadInfo
        title="Tamagui"
        description="React style library and UI kit that unifies React Native and React web"
      />
      <H1>Hello {hello}</H1>
    </>
  )
}
