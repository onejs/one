import { styled, View } from "tamagui";

export const PageContainer = styled(View, {
  w: "100%",
  maw: 1200,
  mx: "auto",

  "$platform-web": {
    py: "$4",
  },
});
