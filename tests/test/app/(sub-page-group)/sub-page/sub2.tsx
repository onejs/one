import { Logo } from '~/features/brand/Logo'
import { Image } from '~/features/ui/Image'
import { PageContainer } from '~/features/ui/PageContainer'

export default function Test() {
  return (
    <PageContainer>
      <Logo />
      <Image src="/" />
    </PageContainer>
  )
}
