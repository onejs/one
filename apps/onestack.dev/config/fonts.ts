import type { FillInFont, GenericFont } from "@tamagui/core";
import { createFont } from "tamagui";

const defaultSizes = {
  1: 11,
  2: 12,
  3: 13,
  4: 14,
  true: 14,
  5: 16,
  6: 18,
  7: 20,
  8: 23,
  9: 30,
  10: 46,
  11: 55,
  12: 62,
  13: 72,
  14: 92,
  15: 114,
  16: 134,
} as const;

function createMainFont<A extends GenericFont>(
  font: Partial<A> = {},
  {
    sizeLineHeight = (size) => size + 10,
    sizeSize = (size) => size * 1,
  }: {
    sizeLineHeight?: (fontSize: number) => number;
    sizeSize?: (size: number) => number;
  } = {},
): FillInFont<A, keyof typeof defaultSizes> {
  // merge to allow individual overrides
  const size = Object.fromEntries(
    Object.entries({
      ...defaultSizes,
      ...font.size,
    }).map(([k, v]) => [k, sizeSize(+v)]),
  );
  return createFont({
    family:
      '-apple-system, Inter, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: Object.fromEntries(Object.entries(size).map(([k, v]) => [k, sizeLineHeight(v)])),
    weight: {
      4: "300",
    },
    letterSpacing: {
      4: 0,
    },
    ...(font as any),
    size,
  });
}

const heading = createMainFont(
  {
    size: {
      5: 13,
      6: 15,
      9: 32,
      10: 48,
    },
    transform: {
      6: "uppercase",
      7: "none",
    },
    weight: {
      6: "400",
      7: "700",
    },
    color: {
      6: "$colorFocus",
      7: "$color",
    },
    letterSpacing: {
      5: 2,
      6: 1,
      7: 0,
      8: 0,
      9: -1,
      10: -1.5,
      12: -2,
      14: -3,
      15: -4,
    },
    // for native
    face: {
      700: { normal: "InterBold" },
      800: { normal: "InterBold" },
      900: { normal: "InterBold" },
    },
  },
  { sizeLineHeight: (size) => Math.round(size * 1.1 + (size < 30 ? 10 : 5)) },
);

const body = createMainFont(
  {
    weight: {
      1: "400",
      7: "600",
    },
  },
  {
    sizeSize: (size) => Math.round(size),
    sizeLineHeight: (size) => Math.round(size * 1.1 + (size >= 12 ? 10 : 4)),
  },
);

const mono = createFont({
  ...body,
  family: '"IBM Plex Mono", Consolas, monospace, monospace',
  size: {
    1: 11 * 1.4,
    2: 12 * 1.4,
    3: 13 * 1.4,
    4: 14 * 1.4,
    true: 14 * 1.4,
    5: 16 * 1.4,
    6: 18 * 1.4,
    7: 20 * 1.4,
    8: 23 * 1.4,
    9: 30 * 1.4,
    10: 46 * 1.4,
    11: 55 * 1.4,
    12: 62 * 1.4,
    13: 72 * 1.4,
    14: 92 * 1.4,
    15: 114 * 1.4,
    16: 134 * 1.4,
  },
  lineHeight: {
    1: 11 * 2.5 - 3,
    2: 12 * 2.5 - 3,
    3: 13 * 2.5 - 3,
    4: 14 * 2.5 - 3,
    true: 14 * 2.5 - 3,
    5: 16 * 2.5 - 3,
    6: 18 * 2.5 - 3,
    7: 20 * 2.5 - 3,
    8: 23 * 2.5 - 3,
    9: 30 * 2.5 - 3,
    10: 46 * 2.5 - 3,
    11: 55 * 2.5 - 3,
    12: 62 * 2.5 - 3,
    13: 72 * 2.5 - 3,
    14: 92 * 2.5 - 3,
    15: 114 * 2.5 - 3,
    16: 134 * 2.5 - 3,
  },
  letterSpacing: {
    6: 1,
    7: 1.5,
    8: 2,
    9: 2.5,
    10: 3,
  },
});

export const fonts = {
  heading,
  body,
  mono,
};
