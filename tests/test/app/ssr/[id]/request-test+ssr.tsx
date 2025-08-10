import { type LoaderProps, useLoader } from 'one'
import { Text, View } from 'tamagui'

export function loader(props: LoaderProps) {
  return {
    hasRequest: !!props.request,
    requestMethod: props.request?.method,
    requestUrl: props.request?.url,
    userAgent: props.request?.headers.get('user-agent'),
    path: props.path,
    params: props.params,
    id: props.params.id,
  }
}

export default function RequestTestWithParamsSSR() {
  const data = useLoader(loader)

  return (
    <View
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      gap={16}
    >
      <Text>SSR Request Test with Params</Text>
      <Text>Has Request:</Text>
      <Text id="has-request">{JSON.stringify(data.hasRequest)}</Text>
      <Text>Request Method:</Text>
      <Text id="request-method">{JSON.stringify(data.requestMethod)}</Text>
      <Text>Request URL:</Text>
      <Text id="request-url">{JSON.stringify(data.requestUrl)}</Text>
      <Text>User Agent:</Text>
      <Text id="user-agent">{JSON.stringify(data.userAgent)}</Text>
      <Text>Path:</Text>
      <Text id="path">{JSON.stringify(data.path)}</Text>
      <Text>Params:</Text>
      <Text id="params">{JSON.stringify(data.params)}</Text>
      <Text>ID:</Text>
      <Text id="id">{JSON.stringify(data.id)}</Text>
    </View>
  )
} 