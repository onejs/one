import { useParams } from "one";
import { View, Text } from "react-native";

export default function Index() {
  const params = useParams();
  return (
    <View>
      <Text testID="dynamic-route-title">This is the [path] page.</Text>
      <Text testID="params-json">{JSON.stringify(params)}</Text>
    </View>
  );
}
