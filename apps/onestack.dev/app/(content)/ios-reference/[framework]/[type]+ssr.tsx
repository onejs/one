import { Link, useLoader, createRoute } from 'one'
import { H2, Paragraph } from 'tamagui'
import {
  Breadcrumbs,
  Member,
  SkippedList,
} from '~/features/ios-reference/ReferenceContent'
import { ReferenceHeader, referenceURL } from '~/features/ios-reference/ReferenceLayout'
import { HeadInfo } from '~/features/site/HeadInfo'

const route = createRoute<'/ios-reference/[framework]/[type]'>()

export const loader = route.createLoader(async ({ params }) => {
  const { getFramework, getType } = await import('~/features/ios-reference/server')
  const doc = await getFramework(params.framework)
  return { framework: doc.name, sdk: doc.sdk, type: getType(doc, params.type) }
})

export default function TypePage() {
  const { framework, sdk, type } = useLoader(loader)
  return (
    <>
      <HeadInfo
        title={`${type.name} | ${framework}`}
        description={`Generated ${framework} API reference for ${type.name}, including members and iOS availability.`}
      />
      <Breadcrumbs framework={framework} type={type.name} />
      <ReferenceHeader title={type.name} group={framework} />
      <Paragraph size="3" color="color10">
        {type.kind}
        {type.availability ? ` · ${type.availability}` : ''} · SDK {sdk}
      </Paragraph>
      <pre className="ios-reference-code">
        <code>{type.signature}</code>
      </pre>
      {type.comment && (
        <Paragraph className="ios-reference-comment" marginVertical="4">
          {type.comment}
        </Paragraph>
      )}
      <H2 size="7" marginTop="7">
        Members <span style={{ opacity: 0.5 }}>({type.members.length})</span>
      </H2>
      {!type.members.length && (
        <Paragraph marginTop="4" color="color10">
          This type has no directly callable members in this snapshot. See the framework’s
          skipped declarations for unsupported APIs.
        </Paragraph>
      )}
      {type.members.map((member, i) => (
        <Member key={i} member={member} />
      ))}
      <SkippedList items={type.skipped} />
      <Paragraph marginTop="7">
        <Link href={referenceURL(framework) as any}>All {framework} types →</Link>
      </Paragraph>
    </>
  )
}
