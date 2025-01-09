import { createContext, useContext, useId } from 'react'

export type ServerHeadInsertionCallback = () => React.ReactElement

const ServerHeadInsertions: Record<
  string,
  undefined | Record<string, ServerHeadInsertionCallback>
> = {}

export const getServerHeadInsertions = (id: string) => {
  if (ServerHeadInsertions[id]) {
    return Object.values(ServerHeadInsertions[id])
  }
}

export const ServerRenderID = createContext('')

export const useServerHeadInsertion = (callback: ServerHeadInsertionCallback) => {
  if (typeof window == 'undefined') {
    const insertionID = useId()
    const id = useContext(ServerRenderID)
    ServerHeadInsertions[id] ||= {}
    ServerHeadInsertions[id][insertionID] = callback
  }
}
