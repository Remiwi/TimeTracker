import { View, TouchableNativeFeedback } from "react-native";

export default function ColorSelector(props: {
  className?: string;
  value: string;
  onChange: (color: string) => void;
  colors: string[];
}) {
  return (
    <View className={props.className}>
      <View className="flex w-full flex-row flex-wrap items-center justify-center gap-5">
        {props.colors.map((color) => (
          <View
            key={color}
            className={"h-10 w-10 overflow-hidden rounded-full"}
            style={{ backgroundColor: color }}
          >
            <TouchableNativeFeedback
              onPress={() => {
                props.onChange(color);
              }}
            >
              <View className="h-full w-full" />
            </TouchableNativeFeedback>
          </View>
        ))}
      </View>
    </View>
  );
}
