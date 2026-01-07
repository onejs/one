import { useParams, usePathname } from 'one'
import { View, Text, H1 } from 'tamagui'

type Props = {
  pageName: string
}

export function HooksTestingPageContent({ pageName }: Props) {
  const pathname = usePathname()
  const params = useParams()

  return (
    <View>
      <H1>This is {pageName}</H1>
      <Text id="page-usePathname">
        Page `usePathname()`: <Text testID="page-usePathname">{pathname}</Text>
      </Text>
      <Text id="page-useParams">
        Page `useParams()`: <Text testID="page-useParams">{JSON.stringify(params)}</Text>
      </Text>
    </View>
  )
}
