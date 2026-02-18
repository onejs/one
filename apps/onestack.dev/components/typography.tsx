import { Paragraph, styled } from 'tamagui'

export const PrettyText = styled(Paragraph, {
  // @ts-ignore web css prop
  textWrap: 'balanced',
  wordWrap: 'normal',
  color: '$color11',
  fontSize: '$6',
  lineHeight: '$7',
})

export const PrettyTextMedium = styled(PrettyText, {
  fontFamily: '$mono',
  fontSize: '$5',
  lineHeight: '$5',
})

export const PrettyTextBigger = styled(PrettyText, {
  fontFamily: '$body',
  // fontFamily: '$mono',
  size: '$8',
  fontWeight: '300',
  my: 5,
  className: '',
  color: '$gray11',

  $gtSm: {
    size: '$9',
    fontWeight: '300',
  },

  '$platform-web': {
    textWrap: 'balanced',
  },

  variants: {
    intro: {
      true: {
        color: '$color11',

        '$theme-dark': {
          color: '$color11',
        },
      },
    },

    subtle: {
      true: {
        color: '$color11',
      },
    },
  } as const,
})

export const PrettyTextBiggest = styled(PrettyText, {
  fontFamily: '$mono',
  // @ts-ignore web css prop
  textWrap: 'pretty',
  fontSize: 60,
  lineHeight: 80,
  fontWeight: '500',
  letterSpacing: -4,
  color: '$color11',
  paddingBottom: 25,

  $sm: {
    fontSize: 50,
    lineHeight: 70,
  },

  $xs: {
    fontSize: 40,
    lineHeight: 55,
  },
})
