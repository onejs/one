import { Link } from 'one'
import { useState } from 'react'
import { Button, H2, H3, Input, Paragraph, SizableText } from 'tamagui'
import type {
  DocMember,
  DocSkipped,
} from '../../../../packages/one/codegen/sdk/doc-types'
import { referenceURL } from './ReferenceLayout'

export function Breadcrumbs({ framework, type }: { framework: string; type?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="ios-reference-breadcrumbs">
      <Link href="/ios-reference">iOS reference</Link> /{' '}
      {type ? (
        <>
          <Link href={referenceURL(framework) as any}>{framework}</Link> / {type}
        </>
      ) : (
        framework
      )}
    </nav>
  )
}

export function Member({ member }: { member: DocMember }) {
  return (
    <article className="ios-reference-member">
      <SizableText color="color10" size="2">
        {member.kind}
        {member.availability ? ` · ${member.availability}` : ''}
      </SizableText>
      <H3 render="h3" size="7" marginTop="2" textTransform="none" letterSpacing={0}>
        {member.name}
      </H3>
      {member.typescript && (
        <>
          <SizableText size="2" color="color10">
            TypeScript
          </SizableText>
          <pre className="ios-reference-code">
            <code>{member.typescript}</code>
          </pre>
        </>
      )}
      <SizableText size="2" color="color10">
        Swift declaration
      </SizableText>
      <pre className="ios-reference-code">
        <code>{member.signature}</code>
      </pre>
      {member.comment && (
        <Paragraph className="ios-reference-comment" size="3">
          {member.comment}
        </Paragraph>
      )}
      {!!member.out?.length && (
        <Paragraph size="3">
          Omit the output parameters from the call. The result contains <code>$ret</code>{' '}
          and <code>$out</code>, with {member.out.join(', ')} inside <code>$out</code>.
        </Paragraph>
      )}
    </article>
  )
}

export function SkippedList({ items }: { items: DocSkipped[] }) {
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(30)
  const matches = items.filter((s) =>
    `${s.name} ${s.reason}`.toLowerCase().includes(query.toLowerCase())
  )
  return (
    <section>
      <H2 size="7" marginTop="7" marginBottom="3">
        Skipped declarations
      </H2>
      {items.length ? (
        <>
          <Paragraph size="3" color="color10" marginBottom="4">
            {items.length.toLocaleString()} declarations were excluded from these
            bindings. Each reason comes from the generator or the iOS SDK compiler.
          </Paragraph>
          <Input
            aria-label="Filter skipped declarations"
            placeholder="Filter declarations or reasons…"
            value={query}
            onChangeText={(v) => {
              setQuery(v)
              setLimit(30)
            }}
          />
          <div aria-live="polite">
            {matches.slice(0, limit).map((s, i) => (
              <div key={`${s.name}-${i}`} className="ios-reference-skipped">
                <Paragraph fontWeight="600" size="3">
                  {s.name}
                </Paragraph>
                <Paragraph size="3" color="color10">
                  {s.reason}
                </Paragraph>
              </div>
            ))}
            {!matches.length && (
              <Paragraph marginTop="3">No matching declarations.</Paragraph>
            )}
          </div>
          {matches.length > limit && (
            <Button marginTop="4" onPress={() => setLimit(limit + 50)}>
              Show more ({matches.length - limit} remaining)
            </Button>
          )}
        </>
      ) : (
        <Paragraph color="color10">
          No declarations were skipped in this snapshot.
        </Paragraph>
      )}
    </section>
  )
}
