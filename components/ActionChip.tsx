import { MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableNativeFeedback, View } from "react-native";

const defaultColor = "#555555";

export type ActionChipProps = {
  key: string;
  text: string;
  textColor?: string;
  leadingIcon?: string;
  leadingIconColor?: string;
  trailingIcon?: string;
  trailingIconColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  onPress?: () => void;
  hide?: boolean;
  disabled?: boolean;
};

export default function ActionChip(props: ActionChipProps) {
  if (props.hide) return <></>;

  return (
    <View className="h-9 overflow-hidden rounded-lg">
      <TouchableNativeFeedback
        disabled={props.disabled}
        onPress={props.onPress}
      >
        <View
          className="flex h-9 flex-row items-center rounded-lg border px-2"
          style={{
            borderColor: props.borderColor || defaultColor,
            backgroundColor: props.backgroundColor || "transparent",
          }}
        >
          {props.leadingIcon && (
            <View
              style={{
                width: 18,
                height: 18,
              }}
            >
              <MaterialIcons
                name={props.leadingIcon as any}
                size={18}
                color={props.leadingIconColor || defaultColor}
              />
            </View>
          )}
          <Text
            className="px-2 font-bold"
            style={{
              color: props.textColor || defaultColor,
            }}
          >
            {props.text}
          </Text>
          {props.trailingIcon && (
            <View
              style={{
                width: 18,
                height: 18,
              }}
            >
              <MaterialIcons
                name={props.trailingIcon as any}
                size={18}
                color={props.trailingIconColor || defaultColor}
              />
            </View>
          )}
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}
