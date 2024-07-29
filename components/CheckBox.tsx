import { Icon } from "./Icon";
import { TouchableNativeFeedback, View } from "react-native";

export default function CheckBox(props: {
  value: boolean;
  onChange(value: boolean): void;
  onStyle?: object;
  offStyle?: object;
  iconColor?: string;
}) {
  return (
    <View className="overflow-hidden rounded-full">
      <TouchableNativeFeedback onPress={() => props.onChange(!props.value)}>
        <View className="p-4">
          <View
            className={
              props.value
                ? "h-8 w-8 rounded-md border border-transparent bg-gray-300"
                : "h-8 w-8 rounded-md border border-dashed border-gray-300"
            }
            style={props.value ? props.onStyle : props.offStyle}
          >
            {props.value && (
              <View className="h-full w-full items-center justify-center">
                <Icon
                  name="material/check"
                  size={24}
                  color={props.iconColor || "#666666"}
                />
              </View>
            )}
          </View>
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}
