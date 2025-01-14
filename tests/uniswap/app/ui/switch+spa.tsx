import { useLayoutEffect, useState } from 'react'
import { Flex, Switch } from 'ui/src'
import { LabeledGroup } from 'ui/src/components/LabeledGroup'

export default () => {
  const [start, setStart] = useState(0)

  useLayoutEffect(() => {
    if (start) {
      console.log('TOOK', Date.now() - start)
    }
  })

  return (
    <Flex gap="$gap12">
      <LabeledGroup title="Default">
        <Switch variant="default" />
        <Switch variant="default" />
        <Switch variant="default" disabled />
      </LabeledGroup>

      <LabeledGroup title="Variant: Branded">
        <Switch variant="branded" />
        <Switch
          variant="branded"
          onCheckedChange={() => {
            setStart(Date.now())
          }}
        />
        <Switch disabled variant="branded" />
      </LabeledGroup>
    </Flex>
  )
}
