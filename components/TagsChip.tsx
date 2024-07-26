import { useState } from "react";
import TagModal from "./TagModal";
import ActionChip from "./ActionChip";
import { View } from "react-native";

export default function TagsChip(props: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  return (
    <>
      <TagModal
        tags={props.tags}
        visible={modalVisible}
        backgroundColor="#f0f0f0"
        height={300}
        positionRelativeTo={buttonLayout}
        onChange={props.onChange}
        onClose={() => setModalVisible(false)}
      />
      <View
        onLayout={(e) => {
          e.target.measure((x, y, width, height, pageX, pageY) => {
            setButtonLayout({ x: pageX, y: pageY, width, height });
          });
        }}
      >
        <ActionChip
          key="tags-edit"
          text="Tags"
          backgroundColor={props.tags.length > 0 ? "#9e8e9e" : "transparent"}
          borderColor={props.tags.length > 0 ? "transparent" : undefined}
          textColor={props.tags.length > 0 ? "#eeeeee" : undefined}
          trailingIconColor={props.tags.length > 0 ? "#eeeeee" : undefined}
          trailingIcon={props.tags.length > 0 ? "edit" : "add"}
          onPress={() => setModalVisible(true)}
        />
      </View>
    </>
  );
}
