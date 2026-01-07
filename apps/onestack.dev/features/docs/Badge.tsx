import { Paragraph, styled } from "tamagui";

export const Badge = styled(Paragraph, {
  userSelect: "none",
  cur: "default",
  size: "$1",
  px: "$2",
  py: "$1",
  br: "$10",
  lineHeight: "$1",

  variants: {
    variant: {
      red: {
        bg: "$red7",
        color: "$red11",
      },

      blue: {
        bg: "$blue7",
        color: "$blue11",
      },

      green: {
        bg: "$green7",
        color: "$green11",
      },

      purple: {
        bg: "$purple7",
        color: "$purple11",
      },

      pink: {
        bg: "$gray3",
        color: "$yellow11",
      },
    },
  } as const,
});
