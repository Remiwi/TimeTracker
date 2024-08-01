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

export default function MyDropDown<T>(props: {
  label?: string;
  placeholder?: string;
  options: T[];
  itemToString: (item: T) => string;
  value?: T;
  onChange?: (item: T) => void;
  bgColor?: string;
  labelColor?: string;
  borderColor?: string;
  textColor?: string;
  modalColor?: string;
  placeholderColor?: string;
  className?: string;
}) {
  const { height, width } = useWindowDimensions();
  const [optionsShown, setOptionsShown] = useState(false);
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
          onLayout={(event) => {
            event.target.measure((rx, ry, width, height, x, y) => {
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
                {props.value && (
                  <Text className="py-1">
                    {props.itemToString(props.value)}
                  </Text>
                )}
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
        {optionsShown && (
          <Modal transparent={true}>
            <TouchableWithoutFeedback onPress={() => setOptionsShown(false)}>
              <View className="relative h-full w-full">
                <View
                  className="asbolute max-h-60 w-full rounded-md"
                  style={{
                    backgroundColor: props.modalColor || "white",
                    width: layout.width,
                    top: above ? layout.y - 210 : layout.y + 4,
                    left: layout.x,
                  }}
                >
                  <FlatList
                    data={props.options}
                    renderItem={({ item: option }) => (
                      <TouchableNativeFeedback
                        onPress={() => {
                          setOptionsShown(false);
                          props.onChange?.(option);
                        }}
                        key={props.itemToString(option)}
                      >
                        <View className="p-4 px-3">
                          <Text>{props.itemToString(option)}</Text>
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
