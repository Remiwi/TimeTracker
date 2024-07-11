import { Text, View } from "react-native";
import ListModal from "./ListModal";
import { useState } from "react";
import { TextInput } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";

export default function TagModal(props: {
  tags: string[];
  onChange?: (tags: string[]) => void;
  onClose?: () => void;
  visible?: boolean;
  backgroundColor?: string;
  positionRelativeTo?: { x: number; y: number; width: number; height: number };
  height?: number;
}) {
  const [text, setText] = useState("");

  return (
    <ListModal
      options={[...props.tags, null]}
      visible={props.visible}
      backgroundColor={props.backgroundColor}
      positionRelativeTo={props.positionRelativeTo}
      height={props.height}
      renderOption={(tag) => {
        if (tag === null) {
          return (
            <View className="flex flex-row gap-4 border-b border-slate-300 px-4 py-2">
              <View className="flex h-8 w-8 items-center justify-center rounded-full">
                <MaterialIcons name="edit" color="black" size={16} />
              </View>
              <TextInput
                className="w-full text-xl"
                value={text}
                onChangeText={setText}
                placeholder="Add Tag..."
                placeholderClassName="color-stone-400"
                onBlur={() => {
                  const t = text.trim();
                  if (t === "") return;
                  props.onChange?.([...props.tags, t]);
                  setText("");
                }}
              />
            </View>
          );
        }
        return (
          <View className="flex flex-row gap-4 border-b border-slate-300 px-4 py-2">
            <View className="flex h-8 w-8 items-center justify-center rounded-full">
              <MaterialIcons name="close" color="black" size={16} />
            </View>
            <Text className="text-xl">{tag}</Text>
          </View>
        );
      }}
      onClose={props.onClose}
      onSelect={(tag) => {
        if (tag === null) {
          return;
        }
        props.onChange?.(props.tags.filter((t) => t !== tag));
      }}
    />
  );
}
