import ReactDOMServer from 'react-dom/server'

import { App } from './App'

export const render = ({ path }: { path: string }) => {
  return ReactDOMServer.renderToString(<App />)
}
