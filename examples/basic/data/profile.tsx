import { useQuery } from '@tanstack/react-query'
import { getURL } from '~/helpers/getURL'

const fetchProfile = async ({ queryKey }) => {
  const [_, page, limit] = queryKey
  const response = await fetch(`${getURL()}/api/profile?page=${page}&limit=${limit}`)
  if (!response.ok) {
    throw new Error('Network response was not ok')
  }
  return response.json()
}

export const useProfile = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['profile', page, limit],
    queryFn: fetchProfile,
  })
}

export { fetchProfile }
