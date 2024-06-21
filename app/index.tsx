import { FlatList, Text, View } from "react-native";

export default function Page() {
  const small = true;
  return (
    <View className="h-full pt-20">
      <View className="pb-6">
        <View className="flex flex-row items-end justify-between px-4 pb-1">
          <View>
            <Text className="pb-2 text-xl font-bold">Template name</Text>
            <Text className="text-6xl">XX:XX:XX</Text>
          </View>
          <View className="aspect-square w-24 rounded-full bg-orange-500 shadow-md shadow-black" />
        </View>
        <View className="px-4">
          <Text>Project name</Text>
          <Text className="font-light">Description</Text>
          <Text className="font-light italic text-gray-400">Tags</Text>
        </View>
      </View>
      <View className="rounded-3xl bg-gray-100 pt-6 shadow-xl shadow-black">
        <View className="flex w-full flex-row gap-2 p-2 pb-4">
          <Folder active={true} />
          <Folder />
          <Folder />
          <Folder />
        </View>
        <View className="flex items-center justify-center pb-4">
          <View className="h-0.5 w-2/3 rounded-full bg-gray-300" />
        </View>
        {small ? (
          <FlatList
            numColumns={3}
            key={3}
            data={[
              0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3,
              4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6,
            ]}
            renderItem={(data) => {
              return (
                <View className="w-1/3">
                  <ItemSmall num={data.index} />
                </View>
              );
            }}
            contentContainerClassName="gap-16"
            className="px-4"
          />
        ) : (
          <FlatList
            numColumns={2}
            key={2}
            data={[
              1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4,
              5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6,
            ]}
            renderItem={(data) => {
              return (
                <View className="w-1/2">
                  <ItemMedium num={data.index} />
                </View>
              );
            }}
            contentContainerClassName="gap-12"
            className="px-4"
          />
        )}
      </View>
    </View>
  );
}

function ItemSmall(props: { num: number }) {
  return (
    <View className="flex h-22 px-1">
      <View className="h-14 w-14 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />
      <View className="-top-14 z-50 h-14 w-14 rounded-full bg-white p-1">
        <View className="h-full w-full rounded-full bg-blue-500" />
      </View>
      <View className="-top-21 flex h-14 w-full rounded-lg bg-white p-2 pt-1 shadow-sm shadow-slate-950">
        <Text className="self-end pb-1 text-sm">XX:XX:XX</Text>
        <Text className="text-sm">Template {props.num}</Text>
      </View>
    </View>
  );
}

function ItemMedium(props: { num: number }) {
  return (
    <View className="flex h-29 px-1">
      <View className="h-18 w-18 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />
      <View className="-top-18 z-50 h-18 w-18 rounded-full bg-white p-1">
        <View className="h-full w-full rounded-full bg-green-500" />
      </View>
      <View className="-top-29 flex h-20 w-full rounded-lg bg-white p-2 pt-1 shadow-sm shadow-slate-950">
        <Text className="text-md self-end pb-6">XX:XX:XX</Text>
        <Text>Template Name {props.num}</Text>
      </View>
    </View>
  );
}

function Folder(props: { active?: boolean }) {
  const inactiveClassName = "bg-white shadow-sm";
  const activeClassName = "bg-gray-200 shadow-inner";

  return (
    <View
      className={
        "flex h-24 w-32 items-center justify-center rounded-2xl pt-1 shadow-black " +
        (props.active ? activeClassName : inactiveClassName)
      }
    >
      <View className="h-16 w-16 bg-black" />
      <Text>Folder name</Text>
    </View>
  );
}
