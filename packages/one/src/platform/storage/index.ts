import { invalidKey, invalidValue } from './validate'

// web entry: the browser's localStorage, under keys only this api reads, so
// getAllKeys lists this api's entries and nothing else the page stored.
const prefix = 'One.Storage.'

function getItem(key: string): string | null {
  if (typeof key !== 'string' || key === '') invalidKey('Storage.getItem')
  return localStorage.getItem(prefix + key)
}

function setItem(key: string, value: string): void {
  if (typeof key !== 'string' || key === '') invalidKey('Storage.setItem')
  if (typeof value !== 'string') invalidValue('Storage.setItem')
  localStorage.setItem(prefix + key, value)
}

function removeItem(key: string): void {
  if (typeof key !== 'string' || key === '') invalidKey('Storage.removeItem')
  localStorage.removeItem(prefix + key)
}

function getAllKeys(): string[] {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) keys.push(key.slice(prefix.length))
  }
  return keys
}

export const Storage = Object.freeze({ getItem, setItem, removeItem, getAllKeys })
