import { router } from 'one'
import { Page, Action } from '../../probe/shell'

export default function Library() {
  return <Page title="Library"><Action title="Back" onPress={() => router.back()} /></Page>
}
