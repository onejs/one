import { useQuery } from '@tanstack/react-query'
import { getURL } from '~/helpers/getURL'

const fetchFeed = async ({ queryKey }) => {
  const [_, page, limit] = queryKey
  const response = await fetch(`${getURL()}/api/feed?page=${page}&limit=${limit}`)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

export const useFeed = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['feed', page, limit],
    queryFn: fetchFeed,
  })
}

export { fetchFeed }
