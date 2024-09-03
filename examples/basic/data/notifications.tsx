import { useQuery } from '@tanstack/react-query'
import { getURL } from '~/helpers/getURL'

const fetchNotifications = async ({ queryKey }) => {
  const [_, page, limit] = queryKey
  const response = await fetch(`${getURL()}/api/notifications?page=${page}&limit=${limit}`)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

export const useNotifications = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['notifications', page, limit],
    queryFn: fetchNotifications,
  })
}

export { fetchNotifications }
