import { One } from 'one'
import { Platform } from 'react-native'

const actionId = 'dev.vxrn.native.tests.echo'
const receiptKey = 'one-app-intents-proof'

if (Platform.OS === 'ios') {
  One.iOS.AppIntents.defineAction(actionId, (text) => {
    const prior = One.iOS.Preferences.getItemSync(receiptKey)
    const count = prior ? Number(prior.split('|')[0]) + 1 : 1
    One.iOS.Preferences.setItemSync(receiptKey, `${count}|${text ?? ''}`)
    return `JS:${text ?? ''}`
  })
}
