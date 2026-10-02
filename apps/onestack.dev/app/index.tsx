import { useState, type KeyboardEvent } from 'react'
import {
  H1,
  H2,
  Paragraph,
  Spacer,
  Text,
  Theme,
  Tooltip,
  View,
  XStack,
  YStack,
  styled,
} from 'tamagui'
import { Button } from '~/components/Button'
import { Community } from '~/components/Community'
import { Team } from '~/components/Team'
import { PrettyText, PrettyTextBigger } from '~/components/typography'
import { OneLogo } from '~/features/brand/Logo'
import { useClipboard } from '~/features/docs/useClipboard'
import { ContainerSm } from '~/features/site/Containers'
import { HeadInfo } from '~/features/site/HeadInfo'
import { Link } from '~/features/site/Link'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { ToggleThemeButton } from '~/features/theme/ThemeToggleButton'

const ButtonText = styled(Text, {
  lh: '0px',
  transition: 'quickest',
  color: 'color11',
  fontWeight: '600',
})

export default function HomePage() {
  return (
    <>
      <HeadInfo
        title="One: React Native, actually native"
        description="One is a Vite framework for web and native: generated SwiftUI and Jetpack Compose, every native API under One.*, bundled in Rust."
        openGraph={{
          images: [
            { url: `${process.env.ONE_SERVER_URL}/og.jpg`, width: 1200, height: 630 },
          ],
        }}
      />

      {/* the whole page sits on one's yellow */}
      <style>{`:root:root { --bodyBgLight: ${YELLOW}; --bodyBgDark: ${YELLOW}; }`}</style>

      <Spacer size="8 gtSm:4" />

      <ContainerSm>
        <XStack justifyContent="space-between" mb="2">
          <View
            group
            containerType="normal"
            scale="0.9 sm:0.75"
            ml={-10}
            mt={-5}
            mx="sm:-32px"
            my="sm:-28px"
            pos="relative"
          >
            <OneLogo size={0.8} animate />
          </View>

          <View
            justifyContent="center"
            flexDirection="row-reverse"
            gap="4 sm:2"
            contain="paint layout"
            mt="sm:-20px"
            alignItems="center"
          >
            <XStack alignItems="center" gap="3 sm:3" justifyContent="sm:center">
              <View ml="sm:3">
                <ToggleThemeButton />
              </View>

              <Link href="/docs/status" asChild>
                <Button size="4" display="sm:none" br="10">
                  <ButtonText color="color12" fontFamily="mono" lh="0px">
                    Status
                  </ButtonText>
                </Button>
              </Link>

              <Theme name="accent">
                <Link href="/docs/introduction" asChild>
                  <Button
                    size="4"
                    bg="color2 hover:color5 press:color9"
                    group
                    transition="quickest"
                    containerType="normal"
                    gap={0}
                    br="10"
                    bw={0}
                  >
                    <ButtonText color="color12" fontFamily="mono" lh="0px">
                      Docs
                    </ButtonText>
                  </Button>
                </Link>
              </Theme>
            </XStack>

            <XStack
              group="card"
              container="card"
              containerType="normal"
              y={-2}
              mr={-10}
              gap="2"
              display="sm:none"
              alignItems="center"
            >
              <SocialLinksRow />
            </XStack>
          </View>
        </XStack>

        <View theme="gray" gap="4" pt="5 sm:8">
          <H1
            fontFamily="heading"
            fontSize="132px sm:64px"
            lineHeight="124px sm:64px"
            letterSpacing="-6px sm:-2px"
            fontWeight="800"
            color={INK}
            mt="6"
          >
            React Native, actually native.
          </H1>

          <PrettyTextBigger color={INK} opacity={0.8}>
            One is a Vite framework for web and native. SwiftUI and Jetpack Compose are
            generated for you, every native API lives under{' '}
            <Code>One.*</Code>, and it all bundles in Rust.
          </PrettyTextBigger>

          <XStack gap="4" alignItems="center" mt="2" flexWrap="wrap">
            <CopyCommand />
            <Link href="/docs/introduction" asChild>
              <Button size="5" br="10" bw={0} bg="color12 hover:color11">
                <ButtonText color="color1">Read the docs</ButtonText>
              </Button>
            </Link>
          </XStack>

          <Separator />

          <Section label="Speed" title="5.4x faster than Metro.">
            <YStack gap="3" mt="2">
              {BUNDLE_TIMES.map((lane) => (
                <XStack key={lane.name} alignItems="center" gap="4">
                  <Text fontFamily="mono" w={80} color="color12" fontWeight="600">
                    {lane.name}
                  </Text>
                  <View
                    h={28}
                    br="4"
                    bg={lane.lead ? INK : 'rgba(20,18,8,0.18)'}
                    w={`${(lane.seconds / BUNDLE_MAX) * 70}%`}
                  />
                  <Text fontFamily="mono" color="color11">
                    {lane.seconds}s
                  </Text>
                </XStack>
              ))}
            </YStack>
            <PrettyText fontSize="4" color={INK} opacity={0.6} mt="3">
              Cold dev bundle of a production iOS app, same machine.
            </PrettyText>
          </Section>

          <Section label="One Native" title="Every native view and API, typed.">
            <PrettyText color={INK}>
              SwiftUI and Jetpack Compose are generated straight from the platform SDKs.
              Haptics, storage, updates, notifications and the rest share one call on iOS
              and Android.
            </PrettyText>
            <CodeBlock>{NATIVE_SAMPLE}</CodeBlock>
            <Link href="/native/overview">
              <PrettyText color={INK}>Explore One Native</PrettyText>
            </Link>
          </Section>

          <Section label="Full stack" title="And the web, from the same app.">
            <PrettyText color={INK}>
              SSG, SSR or SPA per route, typed loaders, middleware and API routes, deployed
              to Vercel or Cloudflare.
            </PrettyText>
          </Section>

          <Separator />

          <Theme name="gray">
            <Link
              asChild
              href="https://testflight.apple.com/join/aNcDUHZY"
              target="_blank"
            >
              <XStack
                render="a"
                className="text-underline-none"
                gap="6"
                transition="medium"
                px="4"
                py="5"
                mt="-4"
                y="hover:-2px"
                bg="hover:color2"
                flexDirection="sm:column"
                alignItems="center"
                justifyContent="center"
                cur="pointer"
                als="center"
                br="9"
              >
                <img
                  width={80}
                  height={80}
                  src="/testflight.webp"
                  alt="Testflight Icon"
                />

                <YStack>
                  <PrettyText
                    fontFamily="mono"
                    mb="1"
                    mt="-2"
                    fontSize="7"
                    lineHeight="7"
                    color="color"
                    size="sm:5"
                    className="text-underline-none"
                    cur="inherit"
                  >
                    Demo
                  </PrettyText>

                  <PrettyText opacity={0.8} cur="inherit" maw={400}>
                    See a sample app on Testflight.
                  </PrettyText>
                </YStack>
              </XStack>
            </Link>
          </Theme>

          <Separator />

          <Community />

          <Separator />

          <Team />
        </View>
      </ContainerSm>
    </>
  )
}

// cold dev bundle of the contrast app on ios, four interleaved runs
// (one session m13021, 2026-09-06): rolldown ~3.6s, metro + babel ~19.5s
const YELLOW = '#F5CA05'
const INK = '#141208'

const BUNDLE_TIMES = [
  { name: 'One', seconds: 3.6, lead: true },
  { name: 'Metro', seconds: 19.5, lead: false },
]
const BUNDLE_MAX = 19.5

const NATIVE_SAMPLE = `import { One } from 'one'

<One.iOS.Button label="Save" onPress={save} />
<One.Android.Switch isOn={on} onIsOnChange={setOn} />

One.Haptics.impact('medium')`

const Section = ({ label, title, children }) => {
  return (
    <YStack gap="3" py="6">
      <Text fontFamily="mono" fontSize="3" color={INK} opacity={0.6} textTransform="uppercase">
        {label}
      </Text>
      <H2
        fontFamily="heading"
        fontSize="48px sm:34px"
        lineHeight="52px sm:38px"
        letterSpacing="-2px sm:-1px"
        fontWeight="800"
        color={INK}
      >
        {title}
      </H2>
      {children}
    </YStack>
  )
}

const Code = styled(Text, {
  fontFamily: 'mono',
  fontSize: '0.9em',
  color: 'color12',
})

const CodeBlock = ({ children }: { children: string }) => {
  return (
    <View bg={INK} br="8" p="5" overflow="hidden">
      <Text fontFamily="mono" fontSize="3" lineHeight="5" color={YELLOW} whiteSpace="pre">
        {children}
      </Text>
    </View>
  )
}

const Separator = styled(View, {
  width: '100%',
  height: 1,
  borderColor: 'color2',
  borderStyle: 'dotted',
  my: '4',
  bw: 0,
  bbw: 1,
})

const CopyCommand = () => {
  const [hovered, setHovered] = useState(false)
  const { hasCopied: hasNpxRunCommandCopied, onCopy: handleCopyNpxRunCommand } =
    useClipboard(`npx one@beta`)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCopyNpxRunCommand()
    }
  }

  const showCopy = hasNpxRunCommandCopied || hovered

  return (
    <Tooltip open={showCopy} placement="right">
      <Tooltip.Trigger asChild>
        <View
          als="center"
          cursor="pointer"
          transition="quick"
          px="3"
          pt={27}
          pb={27}
          color="hover:color11"
          bg="hover:color2 press:color2"
          onPress={handleCopyNpxRunCommand}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          br="6"
          flexDirection="row"
          alignItems="center"
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Copy npx one@beta command"
        >
          <Text
            fontFamily="mono"
            color="inherit"
            fontSize="46px sm:32px"
            lineHeight="46px"
            y={-3}
            letterSpacing="-2px sm:-1px"
            fontWeight="bold"
            lh="0px"
          >
            npx one@beta
          </Text>

          <View role="img" aria-label="Copy icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={22}
              height={22}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                marginRight: 4,
                marginTop: -5,
                marginLeft: 20,
                transform: 'translateY(-1px)',
              }}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </View>
        </View>
      </Tooltip.Trigger>
      <Tooltip.Content
        scale="1 enter:0.98 exit:0.98"
        x="0 enter:-2px exit:-2px"
        y="-1px enter:0 exit:0"
        opacity="1 enter:0 exit:0"
        transition={{
          preset: 'quick',
          opacity: { preset: 'quick', spring: { overshootClamping: true } },
        }}
      >
        <Paragraph size="2" lineHeight="1">
          {hasNpxRunCommandCopied ? 'Copied!' : 'Copy'}
        </Paragraph>
      </Tooltip.Content>
    </Tooltip>
  )
}
