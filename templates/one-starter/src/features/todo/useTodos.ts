import { useMemo } from 'react'
import { todosByUserId } from '~/data/todo/queries'
import { useAuth } from '~/features/auth/client/authClient'
import { useQuery, zero } from '~/zero/client'
import type { Todo } from '~/data/types'
export type { Todo } from '~/data/types'
export function useTodos() {
  const auth = useAuth()
  const userId = auth?.user?.id
  const [todos, { type }] = useQuery(
    todosByUserId,
    {
      userId: userId || '',
    },
    {
      enabled: Boolean(userId),
    },
  )
  const isLoading = type === 'unknown'
  const sortedTodos = useMemo(() => {
    if (!todos) return []
    return [...todos]
  }, [todos])
  const addTodo = (text: string) => {
    if (!userId) return
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      userId,
      text,
      completed: false,
      createdAt: Date.now(),
    }
    zero.mutate.todo.insert(newTodo)
  }
  const toggleTodo = (todoId: string, completed: boolean) => {
    zero.mutate.todo.update({
      id: todoId,
      completed,
    })
  }
  const deleteTodo = (todoId: string) => {
    zero.mutate.todo.delete({
      id: todoId,
    })
  }
  return {
    todos: sortedTodos,
    isLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
  }
}
