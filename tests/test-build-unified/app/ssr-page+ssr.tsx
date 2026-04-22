import { useLoader } from 'one'

export function loader() {
  return { mode: 'ssr', at: Date.now() }
}

export default function SSR() {
  const data = useLoader(loader)
  return (
    <div>
      <h1 id="ssr-title">SSR</h1>
      <p id="ssr-mode">{data.mode}</p>
    </div>
  )
}
