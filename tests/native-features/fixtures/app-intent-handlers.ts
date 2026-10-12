import { One } from 'one'
import { Platform } from 'react-native'

const actionId = 'dev.vxrn.native.tests.echo'
const receiptKey = 'one-app-intents-proof'

if (Platform.OS === 'ios') {
  One.AppIntents.defineAction(actionId, (text) => {
    const prior = One.Storage.getItem(receiptKey)
    const count = prior ? Number(prior.split('|')[0]) + 1 : 1
    One.Storage.setItem(receiptKey, `${count}|${text ?? ''}`)
    return `JS:${text ?? ''}`
  })
}
