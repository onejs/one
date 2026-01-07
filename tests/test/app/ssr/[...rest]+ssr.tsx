import { Link, type LoaderProps, useLoader, useParams } from 'one'
import { memo } from 'react'
import { Separator, Text, View } from 'tamagui'

export function loader(props: LoaderProps) {
  return {
    // @ts-ignore
    path: [].concat(props.params.rest).join('/'),
  }
}

export function ParamsSSR() {
  const { path } = useLoader(loader)
  const href = `/ssr/${path}-next` as any

  return (
    <View
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      gap={16}
    >
      <Text>Params SSR</Text>
      <Text>Params:</Text>
      <Text id="params">{JSON.stringify(useParams())}</Text>

      <Separator />

      <Text>Data:</Text>
      <Text id="data">{JSON.stringify(path)}</Text>

      <Separator />

      <Link id="test-change-sub-route" href={href}>
        Change sub-route to {href}
      </Link>

      <TestSubComponentParams />
    </View>
  )
}

const TestSubComponentParams = memo(() => {
  const params = useParams()
  return <Text id="sub-params">sub params are: {JSON.stringify(params)}</Text>
})
