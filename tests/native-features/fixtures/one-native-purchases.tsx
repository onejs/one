import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { One } from 'one'

const productId = 'dev.vxrn.native.tests.purchases.unlock'

function code(error: unknown): string {
  return error !== null && typeof error === 'object' && 'code' in error
    ? String(error.code) : String(error)
}

export default function OneNativePurchases() {
  const [catalog, setCatalog] = useState('loading')
  const [before, setBefore] = useState('pending')
  const [purchase, setPurchase] = useState('idle')
  const [proof, setProof] = useState('idle')
  const [invalid, setInvalid] = useState('pending')
  const [updates, setUpdates] = useState(0)
  const [sync, setSync] = useState('idle')

  useEffect(() => {
    const remove = One.Purchases.addTransactionListener((update) => {
      if (update.status === 'verified' && update.transaction?.productId === productId) {
        setUpdates((count) => count + 1)
      }
    })
    One.Purchases.getProducts([productId])
      .then((products) => {
        const product = products[0]
        setCatalog(product?.id === productId && product.type === 'nonConsumable' &&
          product.displayPrice.length > 0 ? 'ready' : 'missing')
      })
      .catch((error) => setCatalog(`error:${code(error)}`))
    One.Purchases.getCurrentEntitlements()
      .then((transactions) => setBefore(transactions.some((item) => item.productId === productId) ? 'entitled' : 'empty'))
      .catch((error) => setBefore(`error:${code(error)}`))
    Promise.all([
      One.Purchases.getProducts([]).then(() => 'accepted', code),
      One.Purchases.purchase('').then(() => 'accepted', code),
      One.Purchases.finishTransaction('invalid').then(() => 'accepted', code),
    ]).then((errors) => setInvalid(errors.join(',')))
    return remove
  }, [])

  async function buy() {
    setPurchase('presenting')
    setProof('running')
    try {
      const result = await One.Purchases.purchase(productId)
      setPurchase(result.status)
      if (result.status !== 'purchased' || !result.transaction) {
        setProof(result.status)
        return
      }
      const transaction = result.transaction
      const before = await One.Purchases.getUnfinishedTransactions()
      const current = await One.Purchases.getCurrentEntitlements()
      const unfinished = before.some((item) => item.id === transaction.id)
      const entitled = current.some((item) => item.id === transaction.id)
      const signed = transaction.jws.split('.').length === 3
      await One.Purchases.finishTransaction(transaction.id)
      const after = await One.Purchases.getUnfinishedTransactions()
      const restored = await One.Purchases.getCurrentEntitlements()
      const finished = !after.some((item) => item.id === transaction.id)
      const remainsEntitled = restored.some((item) => item.id === transaction.id)
      setProof(`unfinished=${unfinished}; entitled=${entitled}; signed=${signed}; finished=${finished}; retained=${remainsEntitled}`)
    } catch (error) {
      setPurchase(`error:${code(error)}`)
      setProof('failed')
    }
  }

  async function restore() {
    setSync('running')
    try {
      await One.Purchases.sync()
      const current = await One.Purchases.getCurrentEntitlements()
      setSync(current.some((item) => item.productId === productId) ? 'entitled' : 'empty')
    } catch (error) {
      setSync(`error:${code(error)}`)
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: 'white', gap: 12 }}>
      <Text style={{ fontSize: 22 }}>StoreKit purchases</Text>
      <Text>Catalog: {catalog}</Text>
      <Text>Before: {before}</Text>
      <Text>Purchase: {purchase}</Text>
      <Text>Proof: {proof}</Text>
      <Text>Invalid: {invalid}</Text>
      <Text>Updates: {updates}</Text>
      <Text>Restore: {sync}</Text>
      <Pressable testID="one-native-purchases-buy" accessibilityRole="button"
        onPress={buy} style={{ padding: 16, backgroundColor: '#d9e5f7' }}>
        <Text>Buy fixture product</Text>
      </Pressable>
      <Pressable testID="one-native-purchases-restore" accessibilityRole="button"
        onPress={restore} style={{ padding: 16, backgroundColor: '#eee' }}>
        <Text>Sync purchases</Text>
      </Pressable>
    </View>
  )
}
