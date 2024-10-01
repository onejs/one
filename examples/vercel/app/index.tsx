import { useEffect, useState } from 'react'
import { useLoader } from 'one'

export const loader = () => ({
  loader: 'works!',
})

export default () => {
  const loaded = useLoader(loader)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/endpoint')
      .then((res) => res.json())
      .then((res) => {
        setData(res)
      })
  }, [])

  return (
    <>
      <h1>vercel test</h1>
      <div>
        {JSON.stringify(loaded)}
        {JSON.stringify(data)}
      </div>
    </>
  )
}
