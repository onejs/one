import { memo, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { isWeb, ScrollView, SizableText, Spinner, XStack, YStack } from 'tamagui'
import { useTodos } from '~/features/todo/useTodos'
import { Button } from '~/interface/buttons/Button'
import { Input } from 'tamagui'
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
                    role="checkbox"
                    aria-checked={!!todo.completed}
                    aria-label={`Complete ${todo.text}`}
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
                  <Button theme="red" px="3" aria-label={`Delete ${todo.text}`} onPress={() => deleteTodo(todo.id)}>
                    ✕
                  </Button>
                </XStack>
              ))}
            </YStack>
          )}
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
