import { H3, YStack } from 'tamagui'
import { ListItem } from '~/interface/ListItem'
import { useServersQuery } from '~/state/server'

export default function HomePage() {
  const servers = useServersQuery()

  return (
    <YStack pt="$10" px="$4">
      <H3>Servers</H3>
      {servers.map((server) => {
        return <ListItem key={server.id}>{server.name}</ListItem>
      })}
    </YStack>
  )
}
