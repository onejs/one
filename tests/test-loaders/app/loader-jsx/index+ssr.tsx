import { ClientFallback, Link, renderJSX, useLoader } from 'one'
import { Text, YStack } from 'tamagui'
import { Counter } from '../../components/LoaderJsxCounter'
import { Ghost } from '../../components/LoaderJsxGhost'

async function Post({ title, delay }: { title: string; delay: number }) {
  await new Promise((r) => setTimeout(r, delay))
  return <Text id={`jsx-post-${title}`}>post-{title}</Text>
}

export async function loader({ search }: { search?: string }) {
  const flipped = new URLSearchParams(search || '').get('flip') === '1'
  const counters = [
    <Counter key="counter-a" label="a" start={10} />,
    <Counter key="counter-b" label="b" start={20} />,
  ]
  if (flipped) counters.reverse()

  return {
    flipped,
    plain: 'plain-data',
    ui: await renderJSX(
      <YStack>
        <Text id="jsx-heading">server heading</Text>
        <Post title="one" delay={20} />
        <Post title="two" delay={1} />
        {counters}
        <ClientFallback fallback={<Text id="ghost-fallback">update the app</Text>}>
          <Ghost />
        </ClientFallback>
      </YStack>
    ),
  }
}

export default function LoaderJsxPage() {
  const data = useLoader(loader)

  return (
    <YStack>
      {data.ui}
      <Text id="jsx-plain">{data.plain}</Text>
      <Link id="flip-order" href={data.flipped ? '/loader-jsx' : '/loader-jsx?flip=1'}>
        flip order
      </Link>
      <Link id="go-regular-loader" href="/loader">
        regular loader
      </Link>
    </YStack>
  )
}
