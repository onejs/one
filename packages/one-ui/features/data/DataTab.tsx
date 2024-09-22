import { useState } from 'react'
import { Button, Input, ScrollView, SizableText, XStack, YStack } from 'tamagui'
import { useQuery } from 'vxs/zero'
import { zero } from '../zero/client'

export function DataTab() {
  const [tab, setTab] = useState('')

  return (
    <YStack p="$6" gap="$6" f={1}>
      <Input />

      <XStack gap="$4" fw="wrap" f={1}>
        {(() => {
          if (!tab) {
            return [
              { name: 'Users' },
              { name: 'Posts' },
              { name: 'Replies' },
              { name: 'Follows' },
              { name: 'Reposts' },
            ].map((table) => {
              return (
                <Button
                  onPress={() => {
                    setTab(table.name)
                  }}
                  key={table.name}
                >
                  {table.name}
                </Button>
              )
            })
          }

          return <ExploreTable name={tab} />
        })()}
      </XStack>
    </YStack>
  )
}

const ExploreTable = ({ name }: { name: string }) => {
  const rows = useQuery(zero.query[name.toLowerCase()])
  const headings = Object.keys(rows[0] || {})

  return (
    <>
      <YStack f={1}>
        <ScrollView h="100%" horizontal>
          <YStack>
            <XStack>
              {headings.map((head) => {
                return (
                  <YStack p={6} w="20%" key={head}>
                    <SizableText>{head}</SizableText>
                  </YStack>
                )
              })}
            </XStack>

            {rows.map((row) => {
              return (
                <XStack key={row.id}>
                  {Object.keys(row).map((col) => {
                    return (
                      <YStack p={6} w="20%" ov="hidden" key={col}>
                        <SizableText f={1} ov="hidden" ellipse>
                          {row[col]}
                        </SizableText>
                      </YStack>
                    )
                  })}
                </XStack>
              )
            })}
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
