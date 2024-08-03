import { Text, View, TextInput } from "react-native";

export default function StyledTextInput(props: {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (text: string) => void;
  bgColor?: string;
  labelColor?: string;
  borderColor?: string;
  textColor?: string;
  placeholderColor?: string;
  className?: string;
  textMinHeight?: number;
  multiline?: boolean;
}) {
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
        {props.label && (
          <Text
            className="absolute -top-3 left-2 bg-gray-50 px-1 text-sm text-slate-600"
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
        <TextInput
          placeholder={props.placeholder}
          placeholderTextColor={props.placeholderColor || "#aaaaaa"}
          value={props.value}
          onChangeText={props.onChange}
          multiline={props.multiline}
          style={{
            minHeight: props.textMinHeight,
            textAlignVertical: "top",
          }}
        />
      </View>
    </View>
  );
}
