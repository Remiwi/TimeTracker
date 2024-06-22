import { useState } from "react";
import { View, Text, TextInput, TouchableNativeFeedback } from "react-native";

export default function MyTagInput(props: {
  placeholder?: string;
  value?: string[];
  onChange?: (text: string[]) => void;
  borderColor?: string;
  textColor?: string;
  placeholderColor?: string;
  className?: string;
}) {
  const [text, setText] = useState("");
  const tags = props.value || [];

  return (
    <View className={props.className}>
      <View
        className="relative rounded-md border-2 border-slate-500 p-2"
        style={[
          props.borderColor
            ? {
                borderColor: props.borderColor,
              }
            : {},
        ]}
      >
        <View className="flex flex-row flex-wrap gap-2">
          {[...tags, ""].map((tag, i) => {
            if (i === tags.length) {
              return (
                <TextInput
                  className="flex-grow"
                  key={0}
                  placeholder={props.placeholder}
                  placeholderTextColor={props.placeholderColor || "#aaaaaa"}
                  value={text}
                  onKeyPress={({ nativeEvent }) => {
                    if (
                      nativeEvent.key === "," ||
                      nativeEvent.key === "Enter"
                    ) {
                      console.log("enter");
                      setText("");
                      if (text.trim() !== "") {
                        props.onChange?.([...tags, text.trim()]);
                      }
                      return;
                    }
                    // if alphanum or space
                    if (nativeEvent.key.match(/^[a-zA-Z0-9 ]$/)) {
                      setText(text + nativeEvent.key);
                      return;
                    }
                    if (nativeEvent.key === "Backspace") {
                      setText(text.slice(0, -1));
                      return;
                    }
                  }}
                />
              );
            }

            return (
              <View className="overflow-hidden rounded-full shadow-sm shadow-slate-800">
                <TouchableNativeFeedback
                  onPress={() => {
                    props.onChange?.([
                      ...tags.slice(0, i),
                      ...tags.slice(i + 1),
                    ]);
                  }}
                >
                  <View
                    className="flex flex-row items-center justify-center gap-1 bg-gray-100 px-3 pt-1"
                    key={tag}
                  >
                    <Text className="pb-1.5">{tag}</Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
