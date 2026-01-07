import React from "react";
import { Text } from "react-native";
import { Slot } from "one";

const text = "Some text";

export default function Layout() {
  return (
    <>
      <Text testID="layout-text-content">{text}</Text>
      <Slot />
    </>
  );
}
