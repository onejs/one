import React from 'react'
import { Slot } from 'one'

console.warn('layout imported')

export default function Layout() {
  console.warn('layout rendered')
  return <Slot />
}
