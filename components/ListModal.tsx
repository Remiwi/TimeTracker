import React, { useState } from "react";
import {
  FlatList,
  Modal,
  TouchableNativeFeedback,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";

export default function ListModal<T>(props: {
  options: T[];
  renderOption: (option: T) => React.ReactNode;
  onSelect?: (selected: T) => void;
  onClose?: () => void;
  visible?: boolean;
  backgroundColor?: string;
  positionRelativeTo?: { x: number; y: number; width: number; height: number };
  height?: number;
}) {
  const height = props.height || 240;
  const layout = props.positionRelativeTo || {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  const { height: screenHeight } = useWindowDimensions(); // Screen size
  const above =
    props.positionRelativeTo !== undefined &&
    layout.y + layout.height + height > screenHeight; // Whether to render above or below bounding box

  const renderPressableOption = (data: { item: T }) => (
    <TouchableNativeFeedback
      onPress={() => {
        props.onSelect?.(data.item);
      }}
    >
      {props.renderOption(data.item)}
    </TouchableNativeFeedback>
  );

  if (!props.visible) {
    return <></>;
  }

  return (
    <Modal transparent={true}>
      <TouchableWithoutFeedback onPress={props.onClose}>
        <View className="relative h-full w-full px-1">
          <View
            className="asbolute w-full rounded-md shadow-md shadow-black"
            style={{
              top: above ? layout.y - 210 : layout.y,
              backgroundColor: props.backgroundColor || "#dddddd",
              maxHeight: height,
            }}
          >
            <FlatList data={props.options} renderItem={renderPressableOption} />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
