import { createContext } from 'react'

const x = createContext({})

export default () => {
  // x
  x.Consumer

  return {
    hello: 'world',
  }
}
