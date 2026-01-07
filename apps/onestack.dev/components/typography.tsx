import { Paragraph, styled } from "tamagui";

export const PrettyText = styled(Paragraph, {
  textWrap: "balanced" as any,
  wordWrap: "normal",
  color: "$color11",
  fontSize: "$6",
  lineHeight: "$7",
});

export const PrettyTextMedium = styled(PrettyText, {
  fontFamily: "$mono",
  fontSize: "$5",
  lineHeight: "$5",
});

export const PrettyTextBigger = styled(PrettyText, {
  fontFamily: "$mono",
  size: "$5",
  my: 5,
  className: "",
  color: "$gray11",

  $gtSm: {
    size: "$6",
  },

  variants: {
    intro: {
      true: {
        color: "$color11",

        "$theme-dark": {
          color: "$color11",
        },
      },
    },

    subtle: {
      true: {
        color: "$color11",
      },
    },
  } as const,
});

export const PrettyTextBiggest = styled(PrettyText, {
  fontFamily: "$mono",
  textWrap: "pretty",
  fontSize: 60,
  lineHeight: 80,
  fontWeight: "500",
  letterSpacing: -4,
  color: "$color11",
  paddingBottom: 25,

  $sm: {
    fontSize: 50,
    lineHeight: 70,
  },

  $xs: {
    fontSize: 40,
    lineHeight: 55,
  },
});
