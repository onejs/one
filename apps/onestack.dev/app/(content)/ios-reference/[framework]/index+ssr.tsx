import { Link, useLoader, createRoute } from 'one'
import { H2, Input, Paragraph } from 'tamagui'
import { useState } from 'react'
import {
  Breadcrumbs,
  Member,
  SkippedList,
} from '~/features/ios-reference/ReferenceContent'
import {
  Coverage,
  ReferenceHeader,
  referenceURL,
} from '~/features/ios-reference/ReferenceLayout'
import { HeadInfo } from '~/features/site/HeadInfo'

const route = createRoute<'/ios-reference/[framework]'>()

export const loader = route.createLoader(async ({ params }) => {
  const { getFramework } = await import('~/features/ios-reference/server')
  const doc = await getFramework(params.framework)
  return {
    ...doc,
    declarations: doc.declarations.map(({ name, kind, availability }) => ({
      name,
      kind,
      availability,
    })),
  }
})

export default function FrameworkPage() {
  const doc = useLoader(loader)
  const [query, setQuery] = useState('')
  const types = doc.declarations.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <>
      <HeadInfo title={`${doc.name} iOS API reference`} description={doc.summary} />
      <Breadcrumbs framework={doc.name} />
      <ReferenceHeader title={doc.name} summary={doc.summary} group={doc.group} />
      <Coverage {...doc} />
      <Paragraph size="2" color="color10" marginBottom="6">
        Generated from iOS SDK {doc.sdk}. Availability is shown on each declaration;
        permissions and entitlements still apply.
      </Paragraph>
      <H2 size="7" marginBottom="4">
        Types
      </H2>
      <Input
        aria-label={`Filter ${doc.name} types`}
        placeholder="Filter types in this framework…"
        value={query}
        onChangeText={setQuery}
      />
      <div className="ios-reference-types">
        {types.map((t) => (
          <Link key={t.name} href={referenceURL(doc.name, t.name) as any}>
            <Paragraph size="4" fontWeight="600">
              {t.name}
            </Paragraph>
            <Paragraph size="2" color="color10">
              {t.kind}
              {t.availability ? ` · ${t.availability}` : ''}
            </Paragraph>
          </Link>
        ))}
      </div>
      {!types.length && <Paragraph>No matching types.</Paragraph>}
      {!!doc.globals.length && (
        <section>
          <H2 size="7">Functions and constants</H2>
          {doc.globals.map((m, i) => (
            <Member key={i} member={m} />
          ))}
        </section>
      )}
      <SkippedList items={doc.omissions} />
    </>
  )
}
