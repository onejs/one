import { useState } from 'react'
import { One } from 'one'
import { Page } from '../../probe/shell'

export default function Settings() {
  const [isOn, setIsOn] = useState(false)
  return <Page title="Settings">
    <One.Linux.Toggle label="Keep this tab's state" isOn={isOn} onIsOnChange={(event) => setIsOn(event.isOn)} />
  </Page>
}
