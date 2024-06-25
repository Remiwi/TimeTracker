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
  colors: string[];
  children?: React.ReactNode;
}) {
  const [colorsShow, setColorsShown] = useState(false);
  const color = props.value.toLowerCase();

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
                  {props.colors.map((color) => (
                    <View
                      key={color}
                      className={"h-10 w-10 overflow-hidden rounded-full"}
                      style={{ backgroundColor: color }}
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
            <View
              className={
                "flex h-10 w-10 items-center justify-center rounded-full"
              }
              style={{ backgroundColor: color }}
            >
              {props.children}
            </View>
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  );
}
