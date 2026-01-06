import {
  Database,
  FileStack,
  FolderCheck,
  Loader,
  TabletSmartphone,
  Triangle,
  X,
} from '@tamagui/lucide-icons'
import { useState, type KeyboardEvent } from 'react'
import {
  Circle,
  EnsureFlexed,
  H5,
  Paragraph,
  Portal,
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
import { Footer } from '~/features/site/Footer'
import { HeadInfo } from '~/features/site/HeadInfo'
import { Link } from '~/features/site/Link'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { ToggleThemeButton } from '~/features/theme/ThemeToggleButton'

const ButtonText = styled(Text, {
  lh: 0,
  animation: 'quickest',
  color: '$color11',
  fontWeight: '600',
})

export default function HomePage() {
  return (
    <>
      <HeadInfo
        title="One, a React Framework"
        description="One is a React framework focused on simplicity that lets you target both web and native at once with a single Vite plugin."
      />

      <Spacer size="$8" $gtSm={{ size: '$4' }} />

      <ContainerSm>
        <XStack jc="space-between" mb="$2">
          <View
            group
            containerType="normal"
            pos="relative"
            scale={0.9}
            ml={-10}
            mt={-5}
            $sm={{ scale: 0.75, mx: -32, my: -28 }}
          >
            <OneLogo size={0.8} animate />
          </View>

          <View
            jc="center"
            fd="row-reverse"
            gap="$4"
            ai="center"
            contain="paint layout"
            $sm={{
              gap: '$3',
              fd: 'column',
              ai: 'flex-end',
              mt: -20,
            }}
          >
            <XStack ai="center" gap="$6" $sm={{ jc: 'center' }}>
              <ToggleThemeButton />

              <Theme name="accent">
                <Link href="/docs/introduction" asChild>
                  <Button
                    size="$5"
                    bg="$color2"
                    br="$10"
                    group
                    animation="quickest"
                    containerType="normal"
                    gap={0}
                    bw={0}
                    hoverStyle={{
                      bg: '$color5',
                    }}
                    pressStyle={{
                      bg: '$color9',
                    }}
                  >
                    <ButtonText color="$color12" fontFamily="$mono" lh={0}>
                      Docs
                    </ButtonText>
                  </Button>
                </Link>
              </Theme>
            </XStack>

            <XStack
              group="card"
              containerType="normal"
              ai="center"
              y={-2}
              mr={-10}
              gap="$2"
              $sm={{ jc: 'center' }}
            >
              <SocialLinksRow />
            </XStack>
          </View>
        </XStack>

        <View theme="yellow" gap="$4" pt="$6">
          <PrettyTextBigger>
            One aims to make web + native with React and React&nbsp;Native much simpler, and faster.
            <br />
            <br />
            One takes{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/faq#why-vite">
              Vite
            </Link>
            ,{' '}
            <Link target="_blank" href="https://vxrn.dev">
              makes it serve
            </Link>{' '}
            React&nbsp;web and React&nbsp;Native. Then adds{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/routing">
              FS routes
            </Link>
            ,{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/routing-modes">
              render modes
            </Link>
            ,{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/routing-loader">
              loaders
            </Link>
            ,{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/routing-middlewares">
              middleware
            </Link>
            , a{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/one-dev">
              CLI
            </Link>
            ,{' '}
            <Link target="_blank" href="https://hono.dev">
              Hono
            </Link>
            ,{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/features">
              etc
            </Link>
            .
          </PrettyTextBigger>

          <PrettyTextBigger>
            One is a simpler framework because it's being designed alongside a sync engine,{' '}
            <Link
              style={{ color: 'var(--color11)' }}
              target="_blank"
              href="https://zero.rocicorp.dev/"
            >
              Zero
            </Link>
            .
          </PrettyTextBigger>

          <YStack mt={40} als="center" ai="center" jc="center" gap="$1" px="$6" bc="$color4">
            <Paragraph size="$5" theme="gray" color="$color8" mb={-20}>
              Bootstrap an app with
            </Paragraph>
            <br />
            <CopyCommand />
          </YStack>

          <YStack>
            <Video />

            <InfoBoxes />
          </YStack>

          {/* <Spacer /> */}

          {/* <EmailSignup />

          <Spacer /> */}

          <Theme name="gray">
            <Link asChild href="https://testflight.apple.com/join/aNcDUHZY" target="_blank">
              <XStack
                tag="a"
                className="text-underline-none"
                gap="$6"
                ai="center"
                jc="center"
                animation="medium"
                cur="pointer"
                als="center"
                px="$4"
                py="$5"
                br="$9"
                hoverStyle={{
                  y: -2,
                  bg: '$color2',
                }}
                $sm={{
                  fd: 'column',
                }}
              >
                <img width={80} height={80} src="/testflight.webp" alt="Testflight Icon" />

                <YStack>
                  <PrettyText
                    fontFamily="$mono"
                    mb="$1"
                    mt="$-2"
                    className="text-underline-none"
                    fontSize="$7"
                    lineHeight="$7"
                    cur="inherit"
                    color="$color"
                    $sm={{
                      size: '$5',
                    }}
                  >
                    Demo
                  </PrettyText>

                  <PrettyText o={0.8} cur="inherit" maw={400}>
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

          <Footer />
        </View>
      </ContainerSm>
    </>
  )
}

const InfoBoxes = () => {
  return (
    <XStack mx="$-8" fw="wrap" rowGap="$1" columnGap="$5" mb="$13" $sm={{ fd: 'column', mx: 0 }}>
      <InfoCard title="Typed FS Routing" Icon={FolderCheck}>
        Typed file-system routing, nested layouts with groups.
      </InfoCard>
      <InfoCard title="Routing Modes" Icon={FileStack}>
        Render any page as SPA, SSR, or SSG, control the global default.
      </InfoCard>
      <InfoCard title="Loaders" Icon={Loader}>
        Typed loaders make it easy to bring in data and migrate from other frameworks.
      </InfoCard>
      <InfoCard title="Web + Native" Icon={TabletSmartphone}>
        Build a website with React. Or a native app with React Native. Or both at once.
      </InfoCard>
      <InfoCard title="100% Vite" Icon={ViteIcon}>
        Not based on Metro, One is a single Vite plugin with few dependencies.
      </InfoCard>
      <InfoCard title="The future of data" Icon={Database}>
        Integration with{' '}
        <a target="_blank" href="https://zerosync.dev" rel="noreferrer">
          ZeroSync
        </a>{' '}
        and other sync engines. Coming soon.
      </InfoCard>
    </XStack>
  )
}

const ViteIcon = (props) => <Triangle rotate="180deg" {...props} />

const InfoCard = ({ title, Icon, children }) => {
  return (
    <YStack
      pos="relative"
      width="calc(50% - var(--t-space-3))"
      mb="$4"
      py="$2"
      // br="$5"
      // bg="$background06"
      $sm={{ w: '100%', mb: '$2' }}
    >
      <YStack fullscreen o={0.25}></YStack>
      <YStack gap="$2" p="$4">
        <Icon als="flex-end" mb={-20} o={0.1} size={28} />
        <H5 fontFamily="$mono" size="$2" color="$color12" mt={-10}>
          {title}
        </H5>
        <PrettyText color="$gray11">{children}</PrettyText>
      </YStack>
    </YStack>
  )
}

function Video() {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <>
      {showVideo && (
        <Portal zi={1000}>
          <YStack
            position={'fixed' as any}
            t={0}
            l={0}
            r={0}
            b={0}
            zi={100_000}
            jc="center"
            ai="center"
            bg="rgba(0,0,0,0.95)"
            gap="$4"
            pe="auto"
            onPress={() => setShowVideo(false)}
          >
            <div className="video-background">
              <EnsureFlexed />
              <iframe
                src="https://www.youtube.com/embed/ZJH4bKkwo90?si=tIVSYmbpEY_0c4-8&amp;autoplay=1&amp;vq=hd1080p;hd=1&amp;modestbranding=1&amp;autohide=1&amp;showinfo=0&amp;rel=0"
                title="One Demo Video"
                style={{ maxWidth: '95%' }}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <Button
              pos="absolute"
              t={10}
              r={10}
              br="$10"
              p="$2"
              onPress={() => setShowVideo(false)}
              aria-label="Close Video"
            >
              <X />
            </Button>
          </YStack>
        </Portal>
      )}

      <View
        als="center"
        miw={250}
        maw={350}
        h={290}
        mt={-33}
        mb={60}
        w="100%"
        ai="center"
        contain="size layout"
        group="card"
        containerType="normal"
        onPress={() => setShowVideo(true)}
        zi={0}
      >
        <View
          animation="quick"
          als="center"
          maxWidth={380}
          w="100%"
          ov="hidden"
          cursor="pointer"
          tag="button"
          aria-label="Promo Video Launcher"
          backgroundColor="transparent"
          borderWidth={0}
          userSelect="none"
          y={10}
        >
          <YStack w="100%" h={205}>
            <div
              style={{
                backgroundImage: `url(/cover.webp)`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                backgroundPosition: 'bottom center',
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </YStack>

          <View pos="absolute" top={0} right={0} bottom={0} left={0} ai="center" jc="center">
            <Circle
              animation="bouncy"
              y={35}
              ai="center"
              size={60}
              shac="$shadowColor"
              shar={10}
            >
              <svg style={{ marginTop: -10 }} width="100%" height="100%" viewBox="0 0 100 100">
                <polygon
                  style={{ transform: 'translateY(6px)' }}
                  points="35,25 75,50 35,75"
                  fill="var(--color8)"
                />
              </svg>
            </Circle>
          </View>
        </View>
        <Paragraph
          animation="quickest"
          fontFamily="$mono"
          size="$5"
          ta="center"
          w={340}
          zi={2}
          px="$5"
          pt={6}
          pb={11}
          bg="$color2"
          br="$8"
          shac="$shadowColor"
          shar={10}
          cur="pointer"
          $group-card-hover={{
            scale: 1.02,
          }}
          $group-card-press={{
            y: 0,
            scale: 0.99,
          }}
          $sm={{
            size: '$6',
          }}
        >
          5m video intro
        </Paragraph>
      </View>
    </>
  )
}

const Separator = styled(View, {
  width: '100%',
  height: 1,
  bc: '$color2',
  borderStyle: 'dotted',
  bw: 0,
  bbw: 1,
  my: '$4',
})

const CopyCommand = () => {
  const [hovered, setHovered] = useState(false)
  const { hasCopied: hasNpxRunCommandCopied, onCopy: handleCopyNpxRunCommand } =
    useClipboard(`npx one@latest`)

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
          animation="quick"
          onPress={handleCopyNpxRunCommand}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          px="$3"
          pt={27}
          pb={27}
          br="$6"
          fd="row"
          ai="center"
          hoverStyle={{
            bg: '$color2',
            //@ts-ignore
            color: '$color11',
          }}
          pressStyle={{
            bg: '$color2',
          }}
          // Add these props
          role="button"
          tabIndex={0}
          // @ts-ignore
          onKeyDown={handleKeyDown}
          aria-label="Copy npx one command"
        >
          <Text
            fontFamily="$mono"
            color="inherit"
            fontSize={46}
            lineHeight={46}
            ls={-2}
            lh={0}
            y={-3}
            fow="bold"
            $sm={{
              fontSize: 32,
              ls: 0,
            }}
          >
            npx one
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
        enterStyle={{ x: -2, y: 0, opacity: 0, scale: 0.98 }}
        exitStyle={{ x: -2, y: 0, opacity: 0, scale: 0.98 }}
        scale={1}
        x={0}
        y={-1}
        opacity={1}
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <Paragraph size="$2" lineHeight="$1">
          {hasNpxRunCommandCopied ? 'Copied!' : 'Copy'}
        </Paragraph>
      </Tooltip.Content>
    </Tooltip>
  )
}
