import { getViteEnvironment } from '../src/check-env'

export default function Index() {
  return (
    <>
      <div id="process-env">{process.env.VITE_ENVIRONMENT}</div>
      <div id="import-meta">{import.meta.env.VITE_ENVIRONMENT}</div>
      <div id="shared-module">{getViteEnvironment()}</div>
    </>
  )
}
