import { setStorageDriver } from '@o/helpers'
import { One } from 'one'

const { Storage } = One

setStorageDriver({
  getItem: Storage.getItem,
  setItem: Storage.setItem,
  removeItem: Storage.removeItem,
  getAllKeys: Storage.getAllKeys,
})
