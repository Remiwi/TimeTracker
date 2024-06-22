import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TouchableNativeFeedback, View } from "react-native";

export default function MyDropDown(props: {
  label?: string;
  placeholder?: string;
  options: string[];
  value?: string;
  onChange?: (text: string) => void;
  bgColor?: string;
  labelColor?: string;
  borderColor?: string;
  textColor?: string;
  placeholderColor?: string;
  className?: string;
}) {
  const [optionsShown, setOptionsShown] = useState(false);

  return (
    <View className={props.className + " z-50"}>
      <View className="relative">
        <View
          className="rounded-md border-2 border-slate-500"
          style={[
            props.borderColor
              ? {
                  borderColor: props.borderColor,
                }
              : {},
          ]}
        >
          {props.label && (
            <Text
              className="absolute -top-3 left-2 z-10 rounded-sm bg-gray-50 px-1 text-sm text-slate-600"
              style={[
                props.labelColor
                  ? {
                      color: props.labelColor,
                    }
                  : {},
                props.bgColor
                  ? {
                      backgroundColor: props.bgColor || "undefined",
                    }
                  : {},
              ]}
            >
              {props.label}
            </Text>
          )}
          <View className="overflow-hidden rounded-sm">
            <TouchableNativeFeedback
              onPress={() => setOptionsShown(!optionsShown)}
            >
              <View className="flex flex-row-reverse items-center justify-between p-2">
                <MaterialIcons
                  name="keyboard-arrow-down"
                  size={24}
                  color={props.borderColor || "aaaaaa"}
                  className="h-8 w-8"
                />
                {props.placeholder && !props.value && (
                  <Text
                    className="py-1"
                    style={{ color: props.placeholderColor || "#aaaaaa" }}
                  >
                    {props.placeholder}
                  </Text>
                )}
                {props.value && <Text className="py-1">{props.value}</Text>}
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
        {optionsShown && (
          <View className="absolute top-14 w-full rounded-b-md bg-gray-50">
            {props.options.map((option) => (
              <TouchableNativeFeedback
                onPress={() => {
                  setOptionsShown(false);
                  if (props.onChange) props.onChange(option);
                }}
                key={option}
              >
                <View className="p-4">
                  <Text>{option}</Text>
                </View>
              </TouchableNativeFeedback>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
