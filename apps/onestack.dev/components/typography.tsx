import { Paragraph, styled } from 'tamagui'

export const PrettyText = styled(Paragraph, {
  textWrap: 'balanced' as any,
  wordWrap: 'normal',
  color: '$color12',
  fontSize: '$6',
  lineHeight: '$7',
})

export const PrettyTextMedium = styled(PrettyText, {
  fontSize: '$5',
  lineHeight: '$5',
})

export const PrettyTextBigger = styled(PrettyText, {
  my: 5,
  fontSize: 18,
  lineHeight: 30,
  ls: -0.1,
  className: '',
  color: '$color12',

  $gtSm: {
    fontSize: 23,
    lineHeight: 38,
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
