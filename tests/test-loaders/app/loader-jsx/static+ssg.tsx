import { renderJSX, useLoader } from 'one'
import { Text, YStack } from 'tamagui'
import { Counter } from '../../components/LoaderJsxCounter'

export async function loader() {
  return {
    ui: await renderJSX(
      <YStack>
        <Text id="jsx-static-heading">static heading</Text>
        <Counter label="static" start={5} />
      </YStack>
    ),
  }
}

export default function LoaderJsxStaticPage() {
  const data = useLoader(loader)
  return <>{data.ui}</>
}
