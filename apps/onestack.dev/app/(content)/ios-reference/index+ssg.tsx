import { Link } from 'one'
import { H2, Paragraph, SizableText, YStack } from 'tamagui'
import index from '~/data/ios-reference/index.json'
import {
  Coverage,
  ReferenceHeader,
  referenceURL,
} from '~/features/ios-reference/ReferenceLayout'
import { HeadInfo } from '~/features/site/HeadInfo'

export default function IOSReferenceIndex() {
  const groups = index.groups
  return (
    <>
      <HeadInfo
        title="iOS API reference"
        description="Browse generated iOS framework bindings, type declarations and coverage in One."
      />
      <ReferenceHeader
        title="iOS API reference"
        summary="Explore the iOS SDK from TypeScript. Browse frameworks, find a type, and see exactly which APIs the generated bindings support."
      />
      <Paragraph marginBottom="6" color="color10">
        {index.frameworks.length} frameworks · iOS SDK {index.sdk} ·{' '}
        <Link href="/docs/guides-ios-apis">Start with Calling iOS APIs ↗</Link>
      </Paragraph>
      {groups.map((group) => (
        <section key={group}>
          <H2 size="7" marginBottom="4">
            {group}
          </H2>
          <div className="ios-reference-grid">
            {index.frameworks
              .filter((f) => f.group === group)
              .map((f) => (
                <Link key={f.name} href={referenceURL(f.name) as any} asChild>
                  <YStack
                    render="a"
                    className="ios-reference-card"
                    padding="4"
                    gap="2"
                    borderWidth={1}
                    borderColor="color5 hover:color8"
                    backgroundColor="hover:color2"
                    borderRadius="4"
                  >
                    <SizableText size="5" fontWeight="600" overflowWrap="anywhere">
                      {f.name}
                    </SizableText>
                    <Paragraph size="2" color="color10" numberOfLines={2}>
                      {f.summary}
                    </Paragraph>
                    <Paragraph size="2">
                      {f.types.toLocaleString()} types · {f.entries.toLocaleString()}{' '}
                      entries · {f.skipped.toLocaleString()} skipped
                    </Paragraph>
                    <Paragraph size="2" color="color10">
                      {f.entries + f.skipped
                        ? Math.round((f.entries / (f.entries + f.skipped)) * 100)
                        : 0}
                      % entry coverage
                    </Paragraph>
                  </YStack>
                </Link>
              ))}
          </div>
        </section>
      ))}
      <Paragraph size="2" color="color10">
        Framework categories follow{' '}
        <a href="https://developer.apple.com/documentation/technologies">
          Apple’s documentation catalog
        </a>
        . Entry coverage counts generated call bindings against call bindings plus skipped
        declarations, rather than all Swift symbols.
      </Paragraph>
    </>
  )
}
