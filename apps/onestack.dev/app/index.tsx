import {
  Database,
  FileStack,
  FolderCheck,
  Loader,
  TabletSmartphone,
  Triangle,
  X,
} from '~/components/icons'
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
  lineHeight: '0px',
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
        <XStack justifyContent="space-between" marginBottom="2">
          <View
            group
            containerType="normal"
            scale="0.9 sm:0.75"
            marginLeft={-10}
            marginTop={-5}
            marginHorizontal="sm:-32px"
            marginVertical="sm:-28px"
            position="relative"
          >
            <OneLogo size={0.8} animate />
          </View>

          <View
            justifyContent="center"
            flexDirection="row-reverse"
            gap="4 sm:2"
            contain="paint layout"
            marginTop="sm:-20px"
            alignItems="center"
          >
            <XStack alignItems="center" gap="3 sm:3" justifyContent="sm:center">
              <View marginLeft="sm:3">
                <ToggleThemeButton />
              </View>

              <Link href="/docs/status" asChild>
                <Button size="4" display="sm:none" borderRadius="10">
                  <ButtonText color="color12" fontFamily="mono" lineHeight="0px">
                    Status
                  </ButtonText>
                </Button>
              </Link>

              <Theme name="accent">
                <Link href="/docs/introduction" asChild>
                  <Button
                    size="4"
                    backgroundColor="color2 hover:color5 press:color9"
                    group
                    transition="quickest"
                    containerType="normal"
                    gap={0}
                    borderRadius="10"
                    borderWidth={0}
                  >
                    <ButtonText color="color12" fontFamily="mono" lineHeight="0px">
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
              marginRight={-10}
              gap="2"
              display="sm:none"
              alignItems="center"
            >
              <SocialLinksRow />
            </XStack>
          </View>
        </XStack>

        <View theme="yellow" gap="4" paddingTop="5 sm:8">
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

          <YStack
            marginTop={20}
            paddingHorizontal="6"
            alignSelf="center"
            alignItems="center"
            justifyContent="center"
          >
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
                paddingHorizontal="4"
                paddingVertical="5"
                marginTop="-4"
                y="hover:-2px"
                backgroundColor="hover:color2"
                flexDirection="sm:column"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                alignSelf="center"
                borderRadius="9"
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
                    marginBottom="1"
                    marginTop="-2"
                    fontSize="7 sm:5"
                    lineHeight="7 sm:5"
                    color="color"
                    className="text-underline-none"
                    cursor="inherit"
                  >
                    Demo
                  </PrettyText>

                  <PrettyText opacity={0.8} cursor="inherit" maxWidth={400}>
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

const InfoBoxes = () => {
  return (
    <XStack
      marginHorizontal="-8 sm:0px"
      rowGap="1"
      columnGap="5"
      marginBottom="13"
      flexDirection="sm:column"
      flexWrap="wrap"
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
    <YStack
      position="relative"
      width="calc(50% - var(--t-space-3)) sm:100%"
      marginBottom="4 sm:2"
      paddingVertical="2"
    >
      <YStack position="absolute" inset={0} opacity={0.25}></YStack>
      <YStack gap="2" padding="4">
        <View alignSelf="flex-end" marginBottom={-20} opacity={0.1}>
          <Icon size={28} />
        </View>
        <H5 fontFamily="mono" size="2" color="color12" marginTop={-10}>
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
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.95)"
            gap="4"
            zIndex={100_000}
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
              position="absolute"
              top={10}
              right={10}
              padding="2"
              borderRadius="10"
              onPress={() => setShowVideo(false)}
              aria-label="Close Video"
            >
              <X />
            </Button>
          </YStack>
        </Portal>
      )}

      <View
        alignSelf="center"
        minWidth={250}
        maxWidth={350}
        height={290}
        width="100%"
        alignItems="center"
        contain="size layout"
        group="card"
        container="card"
        containerType="normal"
        onPress={() => setShowVideo(true)}
        zIndex={0}
        scale={0.85}
        margin={-40}
        marginBottom={0}
      >
        <View
          transition="quick"
          alignSelf="center"
          maxWidth={380}
          width="100%"
          overflow="hidden"
          cursor="pointer"
          render="button"
          aria-label="Promo Video Launcher"
          backgroundColor="transparent"
          borderWidth={0}
          userSelect="none"
          y={10}
        >
          <YStack width="100%" height={205}>
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
            position="absolute"
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
              shadowColor="shadowColor"
              shadowRadius={10}
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
          width={340}
          paddingHorizontal="5"
          paddingTop={6}
          paddingBottom={11}
          backgroundColor="color2"
          scale="group-hover/card:1.02 group-press/card:0.99"
          y="group-press/card:0"
          textAlign="center"
          zIndex={2}
          borderRadius="8"
          shadowColor="shadowColor"
          shadowRadius={10}
          cursor="pointer"
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
  marginVertical: '4',
  borderWidth: 0,
  borderBottomWidth: 1,
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
          alignSelf="center"
          cursor="pointer"
          transition="quick"
          paddingHorizontal="3"
          paddingTop={27}
          paddingBottom={27}
          backgroundColor="hover:color2 press:color2"
          borderRadius="6"
          flexDirection="row"
          alignItems="center"
          onPress={handleCopyNpxRunCommand}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="Copy npx one command"
        >
          <Text
            fontFamily="mono"
            color={hovered ? 'color11' : 'color'}
            fontSize="46px sm:32px"
            lineHeight="0px"
            y={-3}
            letterSpacing="-2px sm:-1px"
            fontWeight="bold"
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
              stroke={hovered ? 'var(--color11)' : 'var(--color)'}
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
