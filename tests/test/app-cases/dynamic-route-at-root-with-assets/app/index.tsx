import { View, Text } from "react-native";
import { Image } from "@tamagui/image-next";
import sampleAssetPng from "../sample-asset.png";

export default function Index() {
  return (
    <View>
      <Image testID="sample-asset-png" src={sampleAssetPng} width={128} height={128} />
      <Image testID="sample-public-png" src="/app-icon.png" width={128} height={128} />
    </View>
  );
}
