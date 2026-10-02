import { memo, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { isWeb, ScrollView, SizableText, Spinner, Theme, XStack, YStack } from 'tamagui'
import { useTodos } from '~/features/todo/useTodos'
import { Button } from '~/interface/buttons/Button'
import { Input } from 'tamagui'
import { PageContainer } from '~/interface/layout/PageContainer'
import { H1, H3 } from '~/interface/text/Headings'
export const HomePage = memo(() => {
  const { todos, isLoading, addTodo, toggleTodo, deleteTodo } = useTodos()
  const [newTodoText, setNewTodoText] = useState('')
  const insets = useSafeAreaInsets()
  const handleAddTodo = () => {
    if (!newTodoText.trim()) return
    addTodo(newTodoText.trim())
    setNewTodoText('')
  }
  const content = (
    <YStack
      position="relative"
      flexBasis="auto"
      bg="background"
      flex={1}
      {...(isWeb && {
        width: '100vw' as any,
        ml: '50%' as any,
        transform: 'translateX(-50%)' as any,
        minHeight: '100vh' as any,
      })}
    >
      {/* notice banner */}
      <Theme name="yellow">
        <XStack bg="color-3" py="3" w="100%">
          <PageContainer>
            <SizableText size="4">
              Your app starts here. Sign in and try synced todos.
            </SizableText>
          </PageContainer>
        </XStack>
      </Theme>

      <YStack
        pb={isWeb ? '10' : insets.bottom + 40}
        gap="6"
        px="4"
        w="100%"
        maxW={1200}
        mx="auto"
        flex={1}
      >
        {/* todo list */}
        <YStack flex={1} gap="4" pt="4">
          <H1 py="2" size="6">
            Todo Demo
          </H1>

          <XStack gap="2" w="100%">
            <Input
              flex={1}
              placeholder="What needs to be done?"
              value={newTodoText}
              onChangeText={setNewTodoText}
              onSubmitEditing={() => handleAddTodo()}
              size="lg"
              h={56}
            />
            <Button onPress={handleAddTodo} theme="accent" px="5">
              Add
            </Button>
          </XStack>

          {isLoading ? (
            <YStack p="4" items="center" justify="center">
              <Spinner size="small" />
            </YStack>
          ) : todos.length === 0 ? (
            <YStack p="4" items="center" justify="center" mt="4">
              <H3>No todos yet - add one above!</H3>
            </YStack>
          ) : (
            <YStack gap="2">
              {todos.map((todo) => (
                <XStack
                  key={todo.id}
                  p="3"
                  bg="color-2"
                  rounded="4"
                  items="center"
                  gap="3"
                  opacity={{
                    press: 0.8,
                  }}
                >
                  <XStack
                    w={20}
                    h={20}
                    rounded="2"
                    borderWidth={2}
                    borderColor={todo.completed ? 'green-500' : 'color-8'}
                    bg={todo.completed ? 'green-500' : 'transparent'}
                    items="center"
                    justify="center"
                    cursor="pointer"
                    onPress={() => toggleTodo(todo.id, !todo.completed)}
                  >
                    {todo.completed && (
                      <SizableText size="1" color="white" fontWeight="bold">
                        ✓
                      </SizableText>
                    )}
                  </XStack>
                  <SizableText
                    flex={1}
                    textDecorationLine={todo.completed ? 'line-through' : 'none'}
                    opacity={todo.completed ? 0.6 : 1}
                  >
                    {todo.text}
                  </SizableText>
                  <Button theme="red" px="3" onPress={() => deleteTodo(todo.id)}>
                    ✕
                  </Button>
                </XStack>
              ))}
            </YStack>
          )}
        </YStack>

        {/* about section */}
        <YStack
          display={{
            default: 'none',
            lg: 'flex',
          }}
          pt={{
            default: '4',
            lg: '12',
          }}
          gap="4"
          w={{
            lg: 340,
          }}
        >
          <Theme name="accent">
            <YStack p="4" bg="color-3" rounded="4" borderColor="color-6" borderWidth={1}>
              <H3 mb="2" color="color-11">
                One Starter
              </H3>
              <YStack gap="2" opacity={0.8}>
                <SizableText size="6">
                  A minimal but complete stack for native and web apps.
                </SizableText>
                <YStack gap="1" mt="1">
                  <SizableText size="4" color="color-11">
                    One • Tamagui • Zero • Better Auth
                  </SizableText>
                  <SizableText size="4" color="color-11">
                    Bun • TypeScript
                  </SizableText>
                </YStack>
                <SizableText size="4" mt="2" opacity={0.7}>
                  Includes scripts for dev, build, deploy, and a clean package structure
                  ready for production.
                </SizableText>
              </YStack>
            </YStack>
          </Theme>
        </YStack>
      </YStack>
    </YStack>
  )
  if (isWeb) {
    return content
  }
  return (
    <ScrollView flex={1} pt={insets.top + 16}>
      {content}
    </ScrollView>
  )
})
