import {
  View,
  TouchableNativeFeedback,
  Modal,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import { useState } from "react";

export default function ColorSelector(props: {
  className?: string;
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}) {
  const [colorsShow, setColorsShown] = useState(false);
  const colors = props.colors || [
    "bg-indigo-600",
    "bg-blue-500",
    "bg-purple-500",
    "bg-fuchsia-700",
    "bg-orange-500",
    "bg-pink-500",
    "bg-red-500",
    "bg-orange-800",
    "bg-slate-600",
    "bg-lime-800",
    "bg-lime-500",
    "bg-teal-500",
    "bg-yellow-400",
    "bg-orange-300",
  ];

  <View className="bg-fuchsia-700"></View>;

  return (
    <View className={props.className}>
      <Modal visible={colorsShow} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setColorsShown(false)}>
          <View className="flex h-full w-full justify-end">
            <TouchableWithoutFeedback>
              <View className="flex items-center rounded-t-2xl bg-white">
                <View className="flex w-full items-center justify-center pt-4">
                  <View className="h-1 w-1/3 rounded-full bg-gray-300" />
                </View>
                <View className="flex w-full flex-row flex-wrap items-center justify-center gap-3 p-4">
                  {colors.map((color) => (
                    <View
                      key={color}
                      className={
                        "h-10 w-10 overflow-hidden rounded-full " + color
                      }
                    >
                      <TouchableNativeFeedback
                        onPress={() => {
                          setColorsShown(false);
                          props.onChange(color);
                        }}
                      >
                        <View className="h-full w-full" />
                      </TouchableNativeFeedback>
                    </View>
                  ))}
                </View>
                <View className="flex w-full items-center justify-center pb-2">
                  <View className="w-3/4 overflow-hidden rounded-full">
                    <TouchableNativeFeedback
                      onPress={() => setColorsShown(false)}
                    >
                      <View className="flex w-full items-center justify-center p-3">
                        <Text className="text-xl">Close</Text>
                      </View>
                    </TouchableNativeFeedback>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <View className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-gray-500">
        <TouchableNativeFeedback onPress={() => setColorsShown(!colorsShow)}>
          <View className="flex h-full w-full items-center justify-center p-1">
            <View className={"h-10 w-10 rounded-full " + props.value} />
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  );
}
