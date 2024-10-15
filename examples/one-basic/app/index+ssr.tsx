import { Text, View } from 'react-native'
import { QueryClient, QueryClientProvider, useQuery, React as rqReact } from '@tanstack/react-query'
import React from 'react'

console.log(`Hello world, from One. React version is ${React.version}. react-query React version is ${rqReact.version}`)
console.log(`React eq? ${React === rqReact ? 'true' : 'false'}`)
console.log(`process.env.VXRN_REACT_19: ${process.env.VXRN_REACT_19}`)

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
      <Text>Hello world, from One. React version is {React.version}. react-query React version is {rqReact.version}</Text>
      <Text>React eq? {React === rqReact ? 'true' : 'false'}</Text>
      <Text>process.env.VXRN_REACT_19: {process.env.VXRN_REACT_19}</Text>
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
