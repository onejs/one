import { setServerData, getServerData } from 'one'

export default function () {
  let serverData

  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    serverData = { fromServer: true }
    setServerData(`test`, serverData)
  } else {
    serverData = getServerData(`test`)
  }

  return <div id="server-data">{JSON.stringify(serverData)}</div>
}
