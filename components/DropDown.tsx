import { MaterialIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
  Text,
  TouchableNativeFeedback,
  View,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from "react-native";

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
  const { height, width } = useWindowDimensions();
  const [optionsShown, setOptionsShown] = useState(false);
  const containerRef = useRef<View>(null);
  const [layout, setLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const above = layout.y + layout.height + 240 > height;

  return (
    <View className={props.className}>
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
          ref={containerRef}
          onLayout={(event) => {
            // var { width, height } = event.nativeEvent.layout;
            if (containerRef.current === null) return;
            containerRef.current.measure((rx, ry, width, height, x, y) => {
              setLayout({ x, y, width, height });
            });
          }}
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
          <Modal transparent={true}>
            <TouchableWithoutFeedback onPress={() => setOptionsShown(false)}>
              <View className="relative h-full w-full">
                <View
                  className="asbolute h-60 w-full rounded-md bg-white"
                  style={{
                    width: layout.width,
                    top: above ? layout.y - 210 : layout.y + layout.height,
                    left: layout.x,
                  }}
                >
                  <FlatList
                    data={props.options}
                    renderItem={({ item: option }) => (
                      <TouchableNativeFeedback
                        onPress={() => {
                          setOptionsShown(false);
                          if (props.onChange) props.onChange(option);
                        }}
                        key={option}
                      >
                        <View className="p-4 px-3" key={option}>
                          <Text>{option}</Text>
                        </View>
                      </TouchableNativeFeedback>
                    )}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </View>
    </View>
  );
}
