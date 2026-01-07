import { createAnimations } from "@tamagui/animations-moti";

export const animations = createAnimations({
  quick: {
    type: "spring",
    damping: 32,
    mass: 1.3,
    stiffness: 350,
  },
  medium: {
    damping: 16,
    stiffness: 120,
    mass: 0.8,
  },
});
