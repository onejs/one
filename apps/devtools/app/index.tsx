import { Globe, Smartphone } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'
import { styled, Tabs, Text, View, XStack, YStack } from 'tamagui'
import { DataTab } from '~/features/data/DataTab'
import { RovingTabs } from '~/features/ui/RovingTabs'
import { startServer } from '@vxrn/devtools'

const ipc = startServer()

export function HomePage() {
  const [devTools, setDevTools] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    ipc.onMessage((message) => {
      if (message.type === 'add-devtool') {
        setDevTools((prev) => [...prev, { id: message.id, name: message.name }])
      }
    })
  }, [])

  console.info('devTools', devTools)

  return (
    <YStack data-tauri-drag-region f={1}>
      <RovingTabs
        initialTab="one"
        tabs={[
          { label: 'Home', value: 'one' },
          { label: 'Logs', value: 'logs' },
          { label: 'REPL', value: 'repl' },
          // { label: 'Data', value: 'data' },
          // { label: 'Dev', value: 'dev' },
        ]}
      >
        <Tabs.Content f={1} data-tauri-drag-region value="one">
          <XStack data-tauri-drag-region p="$4" f={1} jc="center" gap="$4" fw="wrap">
            <ActionCard name="Open Web" Icon={Globe} />
            <ActionCard name="Open iOS" Icon={Smartphone} />
            <ActionCard name="Open Android" Icon={Smartphone} />

            <ActionCard name="Build Web" />
            <ActionCard name="Build iOS" />
            <ActionCard name="Build Android" />
          </XStack>
        </Tabs.Content>

        <Tabs.Content f={1} value="data">
          <DataTab />
        </Tabs.Content>
      </RovingTabs>
    </YStack>
  )
}

const ActionCard = ({ name, Icon }: { name: string; Icon?: any }) => {
  return (
    <Card data-tauri-drag-region>
      {Icon && <Icon size={38} />}

      <Text userSelect="none" fontSize={18} ta="center" cur="inherit">
        {name}
      </Text>
    </Card>
  )
}

const Card = styled(View, {
  cur: 'pointer',
  gap: '$4',
  ai: 'center',
  jc: 'center',
  w: '30%',
  f: 1,
  bg: '$background025',
  p: '$6',
  br: '$4',
  mih: 150,

  hoverStyle: {
    bg: '$color4',
  },
})
