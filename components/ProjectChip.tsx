import { Project } from "@/apis/types";
import ListModal from "./ListModal";
import { Text, View } from "react-native";
import { Icon } from "./Icon";
import { useProjects } from "@/hooks/projectQueries";
import { useState } from "react";
import ActionChip from "./ActionChip";

export default function ProjectChip(props: {
  project: Project | null;
  onSelect: (project: Project | null) => void;
}) {
  const projectsQuery = useProjects();
  const [modalVisible, setModalVisible] = useState(false);
  const [buttonLayout, setButtonLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  return (
    <>
      <ListModal
        options={projectsQuery.data || []}
        visible={modalVisible}
        backgroundColor="#f0f0f0"
        height={300}
        positionRelativeTo={buttonLayout}
        renderOption={(option: Project) => (
          <View className="flex flex-row gap-4 border-b border-slate-300 px-4 py-2">
            <View
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: option.color }}
            >
              <Icon name={option.icon as any} color={"white"} size={16} />
            </View>
            <Text className="text-xl" style={{ color: option.color }}>
              {option.name}
            </Text>
          </View>
        )}
        onClose={() => setModalVisible(false)}
        onSelect={(selected: Project) => {
          props.onSelect(selected);
          setModalVisible(false);
        }}
      />
      <View
        onLayout={(e) => {
          e.target.measure((x, y, width, height, pageX, pageY) => {
            setButtonLayout({ x: pageX, y: pageY, width, height });
          });
        }}
      >
        <ActionChip
          key="project-edit"
          backgroundColor={props.project?.color || "transparent"}
          borderColor={props.project?.id ? "transparent" : undefined}
          textColor={props.project?.id ? "#eeeeee" : undefined}
          trailingIconColor={props.project?.id ? "#eeeeee" : undefined}
          text={props.project?.name || "Project"}
          trailingIcon={props.project?.id ? "close" : "add"}
          onPress={() => {
            if (props.project) {
              props.onSelect(null);
            } else {
              setModalVisible(true);
            }
          }}
        />
      </View>
    </>
  );
}
