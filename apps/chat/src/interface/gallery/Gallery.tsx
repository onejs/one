import { AnimatePresence } from '@tamagui/animate-presence'
import { Image } from '@tamagui/image-next'
import { ChevronLeft, ChevronRight, X } from '@tamagui/lucide-icons'
import { createEmitter } from '@vxrn/emitter'
import { useEffect, useState } from 'react'
import { useWindowDimensions } from 'react-native'
import { Button, type ButtonProps, styled, useDebounceValue, XStack, YStack } from 'tamagui'
import type { Attachment } from '~/zero'

export const galleryEmitter = createEmitter<{
  items: readonly Attachment[]
  firstItem?: string
} | null>()

const GalleryItem = styled(YStack, {
  zIndex: 1,
  x: 0,
  opacity: 1,
  inset: 0,
  pos: 'absolute',
  ai: 'center',
  jc: 'center',

  variants: {
    // 1 = right, 0 = nowhere, -1 = left
    going: {
      ':number': (going) => ({
        enterStyle: {
          x: going === 0 ? 0 : going > 0 ? 1000 : -1000,
          opacity: 0,
        },
        exitStyle: {
          zIndex: 0,
          x: going === 0 ? 0 : going < 0 ? 1000 : -1000,
          opacity: 0,
        },
      }),
    },
  } as const,
})

export const Gallery = () => {
  const galleryItems = galleryEmitter.useValue()
  const [[page, going], setPage] = useState([0, 0])
  const dimensions = useWindowDimensions()
  const items = galleryItems?.items || []
  const images = items.map((i) => i.url)
  const [lastImages, setLastImages] = useState(images)
  const hidden = !items.length
  const src = images[page] || lastImages[page]
  const paginate = (going: number) => {
    setPage([page + going, going])
  }

  if (images.length && lastImages !== images) {
    setLastImages(images)
  }

  const [fullyHidden, setFullyHidden] = useState(true)
  if (!hidden && fullyHidden) {
    setFullyHidden(false)
  }
  useEffect(() => {
    if (hidden) {
      const tm = setTimeout(() => {
        setFullyHidden(true)
      }, 500)
      return () => {
        clearTimeout(tm)
      }
    }
  }, [hidden])

  const firstItem = galleryItems?.firstItem

  useEffect(() => {
    if (firstItem) {
      setPage([items.findIndex((x) => x.id === firstItem), 0])
    }
  }, [firstItem])

  return (
    <XStack
      animation="quickest"
      overflow="hidden"
      backgroundColor="rgba(0,0,0,0.5)"
      width="100%"
      alignItems="center"
      pos="absolute"
      inset={0}
      zi={100_000}
      {...(hidden
        ? {
            opacity: 0,
            pointerEvents: 'none',
          }
        : {
            opacity: 1,
          })}
    >
      {items && (
        <>
          <Button
            pos="absolute"
            circular
            icon={X}
            zi={100}
            size="$3"
            t="$4"
            r="$4"
            onPress={() => {
              galleryEmitter.emit(null)
            }}
          />

          <AnimatePresence initial={false} custom={{ going }}>
            <GalleryItem key={page} animation="quick" going={going}>
              {!!src && !fullyHidden && (
                <YStack animation="quick" {...(hidden ? { o: 0, y: 10 } : { o: 1, y: 0 })}>
                  <Image
                    objectFit="contain"
                    src={src}
                    width={dimensions.width - 20}
                    height={dimensions.height - 20}
                  />
                </YStack>
              )}
            </GalleryItem>
          </AnimatePresence>

          <GalleryButton
            aria-label="Carousel left"
            left="$4"
            icon={ChevronLeft}
            onPress={() => paginate(-1)}
            inactive={page <= 0}
          />

          <GalleryButton
            aria-label="Carousel right"
            right="$4"
            icon={ChevronRight}
            onPress={() => paginate(1)}
            inactive={page >= images.length - 1}
          />
        </>
      )}
    </XStack>
  )
}

const GalleryButton = ({ inactive, ...props }: ButtonProps & { inactive?: boolean }) => {
  return (
    <Button
      size="$5"
      position="absolute"
      circular
      elevate
      zi={100}
      {...(inactive && {
        opacity: 0.25,
        pointerEvents: 'none',
      })}
      {...props}
    />
  )
}
