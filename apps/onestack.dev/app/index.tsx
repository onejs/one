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
import { PrettyText } from '~/components/typography'
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
        title="One: React Native, all in one"
        description="The faster, easier and more complete way to build React Native apps: works with what you use, with 100% native API coverage built in."
        openGraph={{
          images: [
            { url: `${process.env.ONE_SERVER_URL}/og.jpg`, width: 1200, height: 630 },
          ],
        }}
      />

      {/* the whole page sits on one's yellow */}
      <style>{`:root:root { --bodyBgLight: ${YELLOW}; --bodyBgDark: ${YELLOW}; }`}</style>

      <Spacer size="8 gtSm:4" />

      <ContainerSm maxWidth={1040}>
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
            fontSize="104px sm:56px"
            lineHeight="100px sm:58px"
            letterSpacing={0}
            fontWeight="800"
            color={INK}
            mt="6"
          >
            React Native,
            <br />
            all in one.
          </H1>

          <Body fontSize="24px sm:20px" lineHeight="34px sm:29px" maw={760}>
            The faster, easier and more complete way to build React Native apps. One
            works with the libraries you already use and gives you everything else out
            of the box, with 100% native API coverage.
          </Body>

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
                  <Text fontFamily="mono" w={80} color={INK} fontWeight="600">
                    {lane.name}
                  </Text>
                  <div
                    style={{
                      height: 28,
                      borderRadius: 6,
                      width: `${(lane.seconds / BUNDLE_MAX) * 70}%`,
                      // one is solid; metro is a dot grid
                      background: lane.lead
                        ? INK
                        : `radial-gradient(${INK} 1.6px, transparent 2.2px) 0 0 / 7px 7px`,
                    }}
                  />
                  <Text fontFamily="mono" color={INK}>
                    {lane.seconds}s
                  </Text>
                </XStack>
              ))}
            </YStack>
            <Body fontSize="15px" lineHeight="22px" opacity={0.65} mt="2">
              Cold dev bundle of a production iOS app, same machine.
            </Body>
          </Section>

          <Section label="One Native" title="Every native view and API, typed.">
            <Body>
              SwiftUI and Jetpack Compose are generated straight from the platform SDKs.
              Haptics, storage, updates, notifications and the rest share one call on iOS
              and Android.
            </Body>
            <CodeBlock code={NATIVE_SAMPLE} />
            <Link href="/native/overview">
              <Body textDecorationLine="underline">Explore One Native</Body>
            </Link>
          </Section>

          <Section label="Batteries included" title="Everything a real app needs.">
            <XStack flexWrap="wrap" columnGap="6" rowGap="5" mt="2">
              {INCLUDED.map((item) => (
                <YStack key={item.title} w="calc(50% - 16px) sm:100%" gap="1">
                  <Text fontFamily="heading" fontWeight="800" fontSize="20px" color={INK}>
                    {item.title}
                  </Text>
                  <Body fontSize="17px" lineHeight="25px" opacity={0.8}>
                    {item.text}
                  </Body>
                </YStack>
              ))}
            </XStack>
          </Section>

          <Section label="No lock-in" title="And it works with what you use.">
            <XStack flexWrap="wrap" gap="3" mt="2">
              {WORKS_WITH.map((name) => (
                <View key={name} bg={INK} br="6" px="4" py="2">
                  <Text fontFamily="mono" fontSize="15px" color={YELLOW}>
                    {name}
                  </Text>
                </View>
              ))}
            </XStack>
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

// what ships in the box; each line traces to a v2 feature
const INCLUDED = [
  { title: 'Routing', text: 'Typed file-system routes, layouts, stacks and tabs.' },
  { title: 'Native UI', text: 'SwiftUI and Jetpack Compose, generated for you.' },
  { title: 'Native APIs', text: 'Haptics, storage, notifications, purchases and more.' },
  { title: 'Updates', text: 'Over-the-air updates with rollback, built in.' },
  { title: 'Data', text: 'Typed loaders with SSR, SSG or SPA per route.' },
  { title: 'Deploy', text: 'Vercel, Cloudflare or your own Hono server.' },
  { title: 'DevTools', text: 'Route debugging, loader timing, source inspector.' },
  { title: 'Builds', text: 'Prebuild, run:ios and run:android, no Expo required.' },
]

const WORKS_WITH = [
  'Expo modules',
  'Expo Go',
  'React Navigation',
  'Reanimated',
  'Nitro modules',
  'Tamagui',
  'NativeWind',
  'Metro mode',
]

const Body = styled(Paragraph, {
  fontFamily: 'body',
  fontSize: '19px',
  lineHeight: '28px',
  fontWeight: '400',
  color: INK,
})

// an eyebrow as an ink tag, tilted a touch
const Section = ({ label, title, children }) => {
  return (
    <YStack gap="3" py="6">
      <View als="flex-start" bg={INK} px="3" py="1" rotate="-2deg" mb="1">
        <Text fontFamily="mono" fontSize="13px" color={YELLOW} textTransform="uppercase">
          {label}
        </Text>
      </View>
      <H2
        fontFamily="heading"
        fontSize="48px sm:34px"
        lineHeight="52px sm:38px"
        letterSpacing={0}
        fontWeight="800"
        color={INK}
      >
        {title}
      </H2>
      {children}
    </YStack>
  )
}

// yellow on ink, with strings a shade lighter and keywords and punctuation dimmer
const CODE_TOKEN = /('[^']*'|"[^"]*"|\bimport\b|\bfrom\b|[{}()<>=/])/
const CODE_COLOR = { string: '#fff3b0', quiet: '#a8921f', text: YELLOW }

const CodeBlock = ({ code }: { code: string }) => {
  return (
    <View bg={INK} br="8" p="5" overflow="hidden">
      <Text fontFamily="mono" fontSize="15px" lineHeight="26px" whiteSpace="pre">
        {code.split(CODE_TOKEN).map((part, i) => {
          const color =
            part.startsWith("'") || part.startsWith('"')
              ? CODE_COLOR.string
              : part === 'import' || part === 'from' || CODE_TOKEN.test(part)
                ? CODE_COLOR.quiet
                : CODE_COLOR.text
          return (
            <Text key={i} color={color}>
              {part}
            </Text>
          )
        })}
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
