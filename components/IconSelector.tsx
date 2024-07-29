import { Text, TextInput, TouchableNativeFeedback, View } from "react-native";
import { materialKeys, materialCommunityKeys } from "@/utils/icons";
import { FlashList } from "@shopify/flash-list";
import { Icon } from "./Icon";
import { useState } from "react";

export function IconSelector(props: {
  onSelect: (icon: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [rowWidth, setRowWidth] = useState(0);
  const [numCols, setNumCols] = useState(4);
  const [search, setSearch] = useState("");

  const sections = [
    {
      title: "Material Community",
      data: materialCommunityKeys,
      prefix: "material-community",
    },
    {
      title: "Material",
      data: materialKeys,
      prefix: "material",
    },
  ];

  const data: (
    | { type: "empty" }
    | { type: "section"; title: string }
    | { type: "icon"; icon: string; prefix: string }
  )[] = [];
  for (const section of sections) {
    const filtered = section.data.filter((icon) =>
      icon.startsWith(search.toLowerCase()),
    );
    data.push({
      type: "section",
      title: `${section.title}  (${filtered.length})`,
    });
    data.push(...Array(numCols - 1).fill({ type: "empty" }));
    data.push(
      ...(filtered.map((icon) => ({
        type: "icon",
        icon: icon,
        prefix: section.prefix,
      })) as {
        type: "icon";
        icon: string;
        prefix: string;
      }[]),
    );
    data.push(
      ...Array(numCols - (filtered.length % numCols)).fill({ type: "empty" }),
    );
  }

  return (
    <View className="flex-grow rounded-md border-2 border-slate-500 pb-2">
      <View className="flex-row items-center gap-2 p-2">
        <Icon name="material/search" size={24} color={"#888888"} />
        <TextInput
          value={search}
          onChangeText={(text) => setSearch(text)}
          className="w-full text-lg"
          placeholder="Search..."
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        ></TextInput>
      </View>
      <FlashList
        nestedScrollEnabled
        onLayout={(e) => {
          setRowWidth(e.nativeEvent.layout.width);
          setNumCols(Math.floor(e.nativeEvent.layout.width / 64));
        }}
        numColumns={numCols}
        data={data}
        renderItem={(data) => {
          if (data.item.type === "empty") {
            return <View className="w-0" />;
          }
          if (data.item.type === "section") {
            return (
              <View className="min-w-full py-1" style={{ width: rowWidth }}>
                <View className="bg-gray-300 px-4">
                  <Text className="text-lg font-bold">{data.item.title}</Text>
                </View>
              </View>
            );
          }

          const prefix = data.item.prefix;
          const icon = data.item.icon;
          return (
            <View className="flex-grow py-2">
              <View className="aspect-square overflow-hidden rounded-md">
                <TouchableNativeFeedback
                  onPress={() => {
                    props.onSelect(`${prefix}/${icon}`);
                  }}
                >
                  <View className="h-full w-full items-center justify-center">
                    <Icon
                      name={`${data.item.prefix}/${data.item.icon}` as any}
                      size={32}
                      color={"black"}
                    />
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          );
        }}
        estimatedItemSize={24}
      />
    </View>
  );
}
