import { MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableNativeFeedback, View } from "react-native";

export default function ActionChip(props: {
  text: string;
  textColor?: string;
  leadingIcon?: string;
  leadingIconColor?: string;
  trailingIcon?: string;
  trailingIconColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  onPress?: () => void;
}) {
  return (
    <View className="h-9 overflow-hidden rounded-lg">
      <TouchableNativeFeedback onPress={props.onPress}>
        <View
          className="flex h-9 flex-row items-center rounded-lg border border-black px-2"
          style={{
            borderColor: props.borderColor || "black",
            backgroundColor: props.backgroundColor || "transparent",
          }}
        >
          {props.leadingIcon && (
            <MaterialIcons
              name={props.leadingIcon as any}
              size={18}
              color={props.leadingIconColor || "black"}
            />
          )}
          <Text
            className="px-2 font-bold"
            style={{
              color: props.textColor || "black",
            }}
          >
            {props.text}
          </Text>
          {props.trailingIcon && (
            <MaterialIcons
              name={props.trailingIcon as any}
              size={18}
              color={props.trailingIconColor || "black"}
            />
          )}
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}
