import { View, Text, FlatList } from "react-native";

const data = ["First item in flat list", "Second item in flat list", "Third item in flat list"];

export function TestComponentWithFlatList() {
  return (
    <View style={{ width: 200, height: 200 }}>
      <FlatList
        data={data}
        renderItem={({ item, index }) => (
          <Text testID={`TestComponentWithFlatList-item-${index}`}>{item}</Text>
        )}
      />
    </View>
  );
}
