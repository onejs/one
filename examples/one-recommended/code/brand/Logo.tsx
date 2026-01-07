import type React from "react";
import { Image, styled } from "tamagui";
import oneBallImage from "./one-ball.png";

const LogoImage = styled(Image, {
  width: 30,
  height: 30,
});

export function Logo(props: React.ComponentProps<typeof LogoImage>) {
  return <LogoImage {...props} src={oneBallImage} />;
}
