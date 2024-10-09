import { Text, View } from 'react-native'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
      }}
    >
      <Text>Hello world, from One</Text>
      <QueryClientProvider client={queryClient}>
        <Example />
      </QueryClientProvider>
    </View>
  )
}

function Example() {
  const { isPending, error, data } = useQuery({
    queryKey: ['repoData'],
    queryFn: () => fetch('https://api.github.com/repos/TanStack/query').then((res) => res.json()),
  })

  if (isPending) return <Text>Loading...</Text>

  if (error) return <Text>{'An error has occurred: ' + error.message}</Text>

  return (
    <View>
      <Text>{data.name}</Text>
      <Text>{data.description}</Text>
      <Text>👀 {data.subscribers_count}</Text>
      <Text>✨ {data.stargazers_count}</Text>
      <Text>🍴 {data.forks_count}</Text>
    </View>
  )
}
