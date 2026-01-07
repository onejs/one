import config from "~/config/tamagui.config";

export const themeTokenNumber = {
  dark: 12,
  light: 9,
};

export const headerColors = {
  dark: "#000",
  light: config.themes.light_yellow[`color${themeTokenNumber.light}`].val,
};
