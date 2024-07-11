import { MaterialIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";

const defaultColor = "#555555";

export default function OptionChip<T>(props: {
  textColor?: string;
  leadingIcon?: string;
  leadingIconColor?: string;
  trailingIcon?: string;
  trailingIconColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  optionsBackgroundColor?: string;
  text: string;
  options: T[];
  renderOption: (option: T) => React.ReactNode;
  onChange?: (selected: T) => void;
}) {
  const { height, width } = useWindowDimensions();
  const [optionsShown, setOptionsShown] = useState(false);
  const containerRef = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const above = layout.y + layout.height + 240 > height;

  const renderPressableOption = (data: { item: T }) => (
    <TouchableNativeFeedback
      onPress={() => {
        setOptionsShown(false);
        props.onChange?.(data.item);
      }}
    >
      {props.renderOption(data.item)}
    </TouchableNativeFeedback>
  );

  return (
    <View className="relative">
      <View
        className="h-9 overflow-hidden rounded-lg"
        ref={containerRef}
        onLayout={(event) => {
          // var { width, height } = event.nativeEvent.layout;
          if (containerRef.current === null) return;
          containerRef.current.measure((rx, ry, width, height, x, y) => {
            setLayout({ x, y, width, height });
          });
        }}
      >
        <TouchableNativeFeedback onPress={() => setOptionsShown(true)}>
          <View
            className="flex h-9 flex-row items-center rounded-lg border px-2"
            style={{
              borderColor: props.borderColor || defaultColor,
              backgroundColor: props.backgroundColor || "transparent",
            }}
          >
            {props.leadingIcon && (
              <MaterialIcons
                name={props.leadingIcon as any}
                size={18}
                color={props.leadingIconColor || defaultColor}
              />
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
              <MaterialIcons
                name={props.trailingIcon as any}
                size={18}
                color={props.trailingIconColor || defaultColor}
              />
            )}
          </View>
        </TouchableNativeFeedback>
      </View>
      {optionsShown && (
        <Modal transparent={true}>
          <TouchableWithoutFeedback onPress={() => setOptionsShown(false)}>
            <View className="relative h-full w-full">
              <View
                className="asbolute h-60 w-full rounded-md"
                style={{
                  top: above ? layout.y - 210 : layout.y,
                  backgroundColor: props.optionsBackgroundColor || "#dddddd",
                }}
              >
                <FlatList
                  data={props.options}
                  renderItem={renderPressableOption}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
}
