import { ScrollView, View } from "react-native";

export default function ChipBar(props: { children: React.ReactNode }) {
  return (
    <View className="flex h-16 w-full justify-center">
      <View className="h-9 w-full">
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          overScrollMode="never"
          contentContainerClassName="px-4 flex flex-row gap-2"
        >
          {props.children}
        </ScrollView>
      </View>
    </View>
  );
}
