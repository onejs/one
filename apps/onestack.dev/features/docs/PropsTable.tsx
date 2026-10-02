import {
  H3,
  H4,
  ListItem,
  Paragraph,
  Separator,
  View,
  XStack,
  YStack,
  styled,
} from 'tamagui'
import { Code } from './Code'

export type PropDef = {
  name: string
  required?: boolean
  deprecated?: boolean
  default?: string | boolean
  type: string
  description?: string
}

export function PropsTable({
  title = 'Props',
  data,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: {
  title?: string
  data: PropDef[]
  'aria-label'?: string
  'aria-labelledby'?: string
}) {
  const hasAriaLabel = !!(ariaLabel || ariaLabelledBy)
  return (
    <YStack
      borderWidth={1}
      borderColor="borderColor"
      my="4"
      mx="-4 sm:0px"
      f={1}
      aria-label={hasAriaLabel ? ariaLabel : 'Component Props'}
      aria-labelledby={ariaLabelledBy}
      br="4"
      ov="hidden"
    >
      <XStack alignItems="center" py="2" px="4" backgroundColor="borderColor">
        <H3 size="3">{title}</H3>
      </XStack>
      {data.map(
        ({ name, type, required, deprecated, default: defaultValue, description }, i) => (
          <ListItem key={`${name}-${i}`} p={0}>
            <YStack width="100%">
              <XStack
                pos="relative"
                py="2"
                bg="background"
                px="4"
                flexDirection="sm:column"
              >
                <YStack
                  position="absolute"
                  inset={0}
                  backgroundColor="background"
                  zi={-1}
                  opacity={0.5}
                />
                <XStack miw="30%" alignItems="center" justifyContent="space-between">
                  <H4
                    color="color"
                    fontFamily="mono"
                    textTransform="none"
                    textDecorationLine={deprecated ? 'line-through' : 'none'}
                    size="4"
                    width={200}
                    fontWeight="700"
                  >
                    {name}
                    {required ? (
                      <Paragraph
                        render="span"
                        // @ts-ignore
                        fontSize="inherit"
                        opacity={0.5}
                      >
                        {' '}
                        <Paragraph render="span" fontWeight="300">
                          (required)
                        </Paragraph>
                      </Paragraph>
                    ) : null}
                  </H4>
                </XStack>

                {!!type && (
                  <>
                    <Separator
                      borderColor="backgroundFocus"
                      als="stretch"
                      vertical
                      mx="3-5"
                      my="2"
                    />

                    <XStack
                      f={2}
                      miw="30%"
                      alignItems="center xs:flex-start"
                      flexDirection="xs:column"
                    >
                      <Paragraph
                        size="3"
                        fontFamily="mono"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        mr="auto"
                        opacity={0.8}
                      >
                        {type}
                      </Paragraph>

                      <XStack alignItems="center">
                        {defaultValue ? (
                          <XStack alignItems="center" gap="1">
                            <Paragraph opacity={0.5} size="2">
                              Default:&nbsp;
                            </Paragraph>
                            <Code my="-1" bg="backgroundPress">
                              {defaultValue}
                            </Code>
                          </XStack>
                        ) : null}

                        {Boolean(defaultValue) && (
                          <Separator
                            borderColor="backgroundFocus"
                            als="stretch"
                            vertical
                            mx="3-5"
                            my="2"
                          />
                        )}

                        {deprecated ? (
                          <View
                            w="8"
                            bg="red2"
                            alignItems="center"
                            theme={'red_alt2' as any}
                            bw={1}
                            br="2"
                          >
                            <Paragraph render="span" size="2" fontWeight="300">
                              deprecated
                            </Paragraph>
                          </View>
                        ) : null}
                      </XStack>
                    </XStack>
                  </>
                )}
              </XStack>

              {!!description && (
                <YStack py="2" px="4">
                  <Paragraph size="3" opacity={0.65}>
                    {description}
                  </Paragraph>
                </YStack>
              )}
            </YStack>
            <Separator borderColor="backgroundFocus" my={2} />
          </ListItem>
        )
      )}
    </YStack>
  )
}
