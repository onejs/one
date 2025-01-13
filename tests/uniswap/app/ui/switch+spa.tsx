import { useState } from 'react'
import { Flex, Switch } from 'ui/src'
import { LabeledGroup } from 'ui/src/components/LabeledGroup'

export default () => {
  const [checked, setChecked] = useState(false)

  return (
    <Flex gap="$gap12">
      <LabeledGroup title="Default">
        <Switch variant="default" onCheckedChange={() => setChecked(!checked)} checked={checked} />
        <Switch variant="default" onCheckedChange={() => setChecked(!checked)} checked={!checked} />
        <Switch
          variant="default"
          onCheckedChange={() => setChecked(!checked)}
          disabled
          checked={!checked}
        />
      </LabeledGroup>

      <LabeledGroup title="Variant: Branded">
        <Switch onCheckedChange={() => setChecked(!checked)} variant="branded" checked={checked} />
        <Switch onCheckedChange={() => setChecked(!checked)} variant="branded" checked={!checked} />
        <Switch
          onCheckedChange={() => setChecked(!checked)}
          disabled
          variant="branded"
          checked={!checked}
        />
      </LabeledGroup>
    </Flex>
  )
}
