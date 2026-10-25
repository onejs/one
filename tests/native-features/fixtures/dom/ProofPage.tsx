'use dom'

import { forwardRef, useState } from 'react'
import { useDOMImperativeHandle, type DOMProps } from 'one/dom'
import image from '../../assets/alternate-icon.svg'
import './dom-proof.css'

export type ProofMethods = {
  read: () => Promise<string>
  clear: () => Promise<void>
  fail: () => Promise<void>
}

type Props = {
  instance: string
  label: string
  onValue: (text: string) => Promise<string>
  onVoid: () => Promise<void>
  onReject: () => Promise<void>
  onDelay: (text: string) => Promise<string>
  dom?: DOMProps
}

export default forwardRef<ProofMethods, Props>(function ProofPage(
  { instance, label, onValue, onVoid, onReject, onDelay },
  ref
) {
  const [text, setText] = useState('')
  const [result, setResult] = useState('none')
  const [lazy, setLazy] = useState('not imported')
  const lazyCount = Reflect.get(globalThis, '__oneDOMProofLazyEvaluations') ?? 0

  useDOMImperativeHandle(
    ref,
    () => ({
      read: async () => text,
      clear: async () => {
        setText('')
      },
      fail: async () => {
        throw new Error('imperative rejection')
      },
    }),
    [text]
  )

  async function run(action: () => Promise<unknown>) {
    try {
      const value = await action()
      setResult(value === undefined ? 'void success' : String(value))
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <main className="one-dom-proof" data-testid={`dom-${instance}`}>
      <h2>
        {instance}: {label}
      </h2>
      <label>
        Browser input
        <input
          aria-label={`${instance} browser input`}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <div className="actions">
        <button onClick={() => void run(() => onValue(text))}>Value action</button>
        <button onClick={() => void run(onVoid)}>Void action</button>
        <button onClick={() => void run(onReject)}>Reject action</button>
        <button onClick={() => void run(() => onDelay(text))}>Delayed action</button>
        <button
          onClick={() =>
            void run(async () => {
              const module = await import('./lazy-proof')
              setLazy(module.value)
              return module.value
            })
          }
        >
          Import lazy module
        </button>
      </div>
      <output aria-label={`${instance} result`}>{result}</output>
      <p>
        Lazy: {lazy}; evaluations: {lazyCount}
      </p>
      <div className="assets">
        <img src={image} width="32" height="32" alt="Bundled DOM image" />
        <span className="font-sample">AB</span>
        <a href="https://example.com/">External navigation</a>
      </div>
    </main>
  )
})
