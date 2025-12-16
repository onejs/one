export default function Index() {
  console.info(`process.env.VITE_ENVIRONMENT`, process.env.VITE_ENVIRONMENT)
  console.info(`import.meta.env.VITE_ENVIRONMENT`, import.meta.env.VITE_ENVIRONMENT)
  
  return (
    <>
      <div id="process-env">{process.env.VITE_ENVIRONMENT}</div>
      <div id="import-meta">{import.meta.env.VITE_ENVIRONMENT}</div>
    </>
  )
}
