import {
  Database,
  FileStack,
  FolderCheck,
  Loader,
  TabletSmartphone,
  Triangle,
  X,
} from '~/features/icons/lucide'
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
import { PrettyText, PrettyTextBigger, PrettyTextMedium } from '~/components/typography'
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
        title="One, a React Framework"
        description="One is a React framework focused on simplicity that lets you target both web and native at once with a single Vite plugin."
        openGraph={{
          images: [
            { url: `${process.env.ONE_SERVER_URL}/og.jpg`, width: 1200, height: 630 },
          ],
        }}
      />

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

        <View theme="yellow" gap="4" pt="5 sm:8">
          <PrettyTextBigger>
            The simplest, fastest, all-in-one React&nbsp;Native framework.
          </PrettyTextBigger>

          <PrettyTextBigger>
            A single Vite plugin for fully-typed{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/routing">
              file-system routes
            </Link>
            , per-page{' '}
            <Link style={{ color: 'var(--color11)' }} href="/docs/render-modes">
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
            <Link style={{ color: 'var(--color11)' }} href="/docs/features">
              ton of features
            </Link>
            , and a production-ready{' '}
            <Link target="_blank" href="https://hono.dev">
              Hono
            </Link>
            , Vercel or Cloudflare server.
          </PrettyTextBigger>

          <YStack mt={20} px="6" als="center" alignItems="center" justifyContent="center">
            <Paragraph size="5" color="color9" theme="gray">
              Get started:
            </Paragraph>
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

          <Separator borderColor="backgroundFocus" />

          <Community />

          <Separator borderColor="backgroundFocus" />

          <Team />
        </View>
      </ContainerSm>
    </>
  )
}

const InfoBoxes = () => {
  return (
    <XStack
      mx="-8 sm:0px"
      rowGap="1"
      columnGap="5"
      mb="13"
      flexDirection="sm:column"
      fw="wrap"
    >
      <InfoCard title="Typed FS Routing" Icon={FolderCheck}>
        Typed file-system routing, nested layouts with groups.
      </InfoCard>
      <InfoCard title="Render Modes" Icon={FileStack}>
        Render any page as SPA, SSR, or SSG, control the global default.
      </InfoCard>
      <InfoCard title="Loaders" Icon={Loader}>
        Typed loaders make it easy to bring in data and migrate from other frameworks.
      </InfoCard>
      <InfoCard title="Web + Native" Icon={TabletSmartphone}>
        Build a website with React. Or a native app with React Native. Or both at once.
      </InfoCard>
      <InfoCard title="Vite-native" Icon={ViteIcon}>
        Use just Vite, even for native, or defer to Metro. One lets you choose.
      </InfoCard>
      <InfoCard title="Simplistic model" Icon={Database}>
        One avoids the complexity of RSC in favor of SSG, SPA, or SSR, with loaders or a
        sync-engine for data.
      </InfoCard>
    </XStack>
  )
}

const ViteIcon = (props) => (
  <View rotate="180deg">
    <Triangle {...props} />
  </View>
)

const InfoCard = ({ title, Icon, children }) => {
  return (
    <YStack pos="relative" w="calc(50% - var(--t-space-3)) sm:100%" mb="4 sm:2" py="2">
      <YStack position="absolute" inset={0} opacity={0.25}></YStack>
      <YStack gap="2" p="4">
        <View als="flex-end" mb={-20} opacity={0.1}>
          <Icon size={28} />
        </View>
        <H5 fontFamily="mono" size="2" color="color12" mt={-10}>
          {title}
        </H5>
        <PrettyText color="gray11">{children}</PrettyText>
      </YStack>
    </YStack>
  )
}

function Video() {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <>
      {showVideo && (
        <Portal zIndex={1000}>
          <YStack
            position={'fixed' as any}
            t={0}
            l={0}
            r={0}
            b={0}
            bg="rgba(0,0,0,0.95)"
            gap="4"
            zi={100_000}
            justifyContent="center"
            alignItems="center"
            pointerEvents="auto"
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
              p="2"
              br="10"
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
        w="100%"
        alignItems="center"
        contain="size layout"
        group="card"
        container="card"
        containerType="normal"
        onPress={() => setShowVideo(true)}
        zi={0}
        scale={0.85}
        m={-40}
        mb={0}
      >
        <View
          transition="quick"
          als="center"
          maxWidth={380}
          w="100%"
          ov="hidden"
          cursor="pointer"
          render="button"
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

          <View
            pos="absolute"
            top={0}
            right={0}
            bottom={0}
            left={0}
            alignItems="center"
            justifyContent="center"
          >
            <Circle
              transition="bouncy"
              y={35}
              alignItems="center"
              size={60}
              shac="shadowColor"
              shar={10}
            >
              <svg
                style={{ marginTop: -10 }}
                width="100%"
                height="100%"
                viewBox="0 0 100 100"
              >
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
          transition="quickest"
          fontFamily="mono"
          size="3 sm:6"
          w={340}
          px="5"
          pt={6}
          pb={11}
          bg="color2"
          scale="group-hover/card:1.02 group-press/card:0.99"
          y="group-press/card:0"
          textAlign="center"
          zi={2}
          br="8"
          shac="shadowColor"
          shar={10}
          cur="pointer"
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
  borderColor: 'color2',
  borderStyle: 'dotted',
  my: '4',
  bw: 0,
  bbw: 1,
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
          aria-label="Copy npx one command"
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
