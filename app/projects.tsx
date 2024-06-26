import BottomSheet from "@/components/BottomSheet";
import ColorSelector from "@/components/ColorSelector";
import MyDropDown from "@/components/DropDown";
import StyledTextInput from "@/components/TextInput";
import useDeleteProject from "@/hooks/useDeleteProject";
import useEditProjects from "@/hooks/useEditProjects";
import useProjects from "@/hooks/useProjects";
import { colors } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Text, TouchableNativeFeedback, View } from "react-native";

type ProjectStuff = {
  id: number;
  name: string;
  color: string;
  icon: string;
};

export default function Page() {
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<
    ProjectStuff | undefined
  >();

  const projects = useProjects();

  const { editProjectDBMutation, editProjectTogglMutation } = useEditProjects();
  const { deleteProjectDBMutation, deleteProjectTogglMutation } =
    useDeleteProject();

  const onEditDone = (project: ProjectStuff) => {
    editProjectDBMutation.mutate(project);
    editProjectTogglMutation.mutate({
      pid: project.id,
      name: project.name,
      color: project.color,
    });
    setProjectModalOpen(false);
  };

  const onEditDelete = (id: number) => {
    deleteProjectDBMutation.mutate(id);
    deleteProjectTogglMutation.mutate(id);
    setProjectModalOpen(false);
  };

  return (
    <>
      {projectModalOpen && (
        <ProjectModal
          onCancel={() => setProjectModalOpen(false)}
          onDone={onEditDone}
          onDelete={onEditDelete}
          defaultProject={selectedProject}
        />
      )}
      <FlatList
        data={projects}
        renderItem={({ item }) => (
          <Project
            key={item.id}
            project={{ ...item }}
            onPress={() => {
              setSelectedProject({ ...item });
              setProjectModalOpen(true);
            }}
          />
        )}
      />
    </>
  );
}

function Project(props: { project: ProjectStuff; onPress?: () => void }) {
  return (
    <TouchableNativeFeedback onPress={props.onPress}>
      <View className="flex flex-row items-center gap-6 border-b border-gray-100 p-4">
        <View
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: props.project.color }}
        >
          <MaterialCommunityIcons
            name={props.project.icon as any}
            size={20}
            color="white"
          />
        </View>
        <Text className="text-lg">{props.project.name}</Text>
      </View>
    </TouchableNativeFeedback>
  );
}

function ProjectModal(props: {
  onCancel?: () => void;
  onDone?: (p: ProjectStuff) => void;
  onDelete?: (id: number) => void;
  defaultProject?: ProjectStuff;
}) {
  const [name, setName] = useState(props.defaultProject?.name || "");
  const [color, setColor] = useState(props.defaultProject?.color || "");
  const [icon, setIcon] = useState(props.defaultProject?.icon || "");

  const iconOptions = [
    "music-note",
    "laptop",
    "dumbbell",
    "filmstrip",
    "book",
    "shopping",
    "wizard-hat",
  ];

  return (
    <BottomSheet onClose={props.onCancel}>
      <View className="px-4">
        <View className="flex w-full flex-row items-center justify-between px-2 pb-8">
          <View className="overflow-hidden rounded-full shadow-sm shadow-slate-900">
            <TouchableNativeFeedback onPress={props.onCancel}>
              <View className="flex w-32 items-center rounded-full bg-gray-100 p-3">
                <Text>Cancel</Text>
              </View>
            </TouchableNativeFeedback>
          </View>
          <View className="overflow-hidden rounded-full shadow-sm shadow-slate-900">
            <TouchableNativeFeedback
              onPress={() => {
                props.onDone?.({
                  id: props.defaultProject?.id || -1,
                  color,
                  icon,
                  name,
                });
              }}
            >
              <View className="flex w-32 items-center rounded-full bg-slate-200 p-3">
                <Text>Done</Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
        <StyledTextInput
          label="Project Name"
          bgColor="white"
          className="pb-4"
          value={name}
          onChange={setName}
        />
        <View className="flex flex-row items-center gap-4 pb-2">
          <ColorSelector
            value={color}
            onChange={setColor}
            colors={colors.map((c) => c.hex)}
          >
            <MaterialCommunityIcons
              name={icon as any}
              size={20}
              color="white"
            />
          </ColorSelector>
          <MyDropDown
            className="flex-grow"
            options={iconOptions}
            value={icon}
            onChange={setIcon}
            itemToString={(i) => i}
            placeholder="Icon"
          />
        </View>
        <View className="w-full items-center justify-center pb-2">
          <View className="overflow-hidden rounded-full">
            <TouchableNativeFeedback
              onPress={() => props.onDelete?.(props.defaultProject?.id || -1)}
            >
              <View className="p-4 px-6">
                <Text className="text-lg font-bold color-red-600">
                  Delete Project
                </Text>
              </View>
            </TouchableNativeFeedback>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
