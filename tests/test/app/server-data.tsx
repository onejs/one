import { setServerData, useLoader } from 'one'

export function loader() {
  setServerData('test', { fromServer: true })
  return { fromServer: true }
}

export default function () {
  const data = useLoader(loader)
  return <div id="server-data">{JSON.stringify(data)}</div>
}
