import { File, Folder, Plus, Minus } from '~/components/icons'
import { Paragraph, ScrollView, XStack, YStack } from 'tamagui'

type RouteNode = {
  name: string
  description?: string
  highlight?: boolean
  children?: RouteNode[]
  delete?: boolean
  add?: boolean
}

export const RouteTree = ({
  routes,
  indent = 0,
}: {
  routes: RouteNode[]
  indent?: number
}) => {
  return (
    <YStack
      overflow="hidden"
      backgroundColor="color3"
      {...(!indent && {
        borderWidth: 2,
        borderColor: 'color4',
        borderRadius: '4',
        marginVertical: '4',
      })}
      {...(indent && {
        borderTopColor: 'color4',
        zIndex: 1000,
        borderTopWidth: 1,
      })}
    >
      <ScrollView
        horizontal
        contentContainerStyle={{
          flexGrow: 1,
          miw: '100%',
        }}
      >
        <YStack flex={1}>
          {routes.map((route, i) => {
            const Icon = route.children ? Folder : File
            const StatusIcon = route.delete ? Minus : route.add ? Plus : null
            const statusColor = route.delete ? 'red10' : route.add ? 'green10' : undefined

            return (
              <YStack
                data-component="RouteTree"
                key={i}
                borderBottomWidth={1}
                borderBottomColor="color3"
                {...((route.highlight || route.add) && {
                  backgroundColor: 'color2',
                })}
                {...(i === routes.length - 1 && {
                  marginBottom: -1,
                })}
                theme={
                  (route.delete ? 'light_gray' : route.add ? 'add' : undefined) as any
                }
              >
                <XStack paddingHorizontal="2">
                  <XStack
                    width="30%"
                    padding="2-5"
                    gap="3"
                    {...(indent && {
                      paddingLeft: '7',
                    })}
                    minWidth={130}
                    overflow="hidden"
                    alignItems="center"
                  >
                    <Icon
                      size={12}
                      color="color10"
                      {...(!route.children && {
                        opacity: 0.5,
                      })}
                    />
                    {StatusIcon && <StatusIcon size={12} color={statusColor} />}
                    <Paragraph
                      flex={1}
                      wordWrap="normal"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      size="1"
                      fontFamily="mono"
                      letterSpacing={-0.5}
                    >
                      {route.name}
                    </Paragraph>
                  </XStack>
                  <YStack padding="2-5">
                    <Paragraph size="4" color="color11">
                      {route.description}
                    </Paragraph>
                  </YStack>
                </XStack>

                {route.children && (
                  <YStack>
                    <RouteTree routes={route.children} indent={indent + 1} />
                  </YStack>
                )}
              </YStack>
            )
          })}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
