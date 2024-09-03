import { useQuery } from '@tanstack/react-query'
import { getURL } from '~/helpers/getURL'

const fetchPost = async ({ queryKey }) => {
  const [_, id] = queryKey
  const response = await fetch(`${getURL()}/api/posts?postId=${id}`)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

export const usePost = (id) => {
  return useQuery({
    queryKey: ['post', id],
    queryFn: fetchPost,
    enabled: !!id, // Ensure the query only runs if id is truthy
  })
}

export { fetchPost }
