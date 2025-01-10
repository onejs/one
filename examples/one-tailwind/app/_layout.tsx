// debug
import { Slot } from 'one'
import './base.css'

export default function Layout() {
  return (
    <>
      {typeof document !== 'undefined' && (
        <>
          <meta charSet="utf-8" />
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
          <link rel="icon" href="/favicon.svg" />
        </>
      )}

      {/* <div className="bg-red-500 p-4 border uppercase">this is bg should be red by tailwind</div> */}

      <Slot />
    </>
  )
}
