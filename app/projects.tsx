import Toggl from "@/apis/toggl";
import BottomSheet from "@/components/BottomSheet";
import ColorSelector from "@/components/ColorSelector";
import MyDropDown from "@/components/DropDown";
import StyledTextInput from "@/components/TextInput";
import useProjects from "@/hooks/useProjects";
import Colors, { colors } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TouchableNativeFeedback,
  View,
} from "react-native";

type ProjectStuff = {
  id: number;
  name: string;
  color: string;
  icon: string;
};

export default function Page() {
  const qc = useQueryClient();

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<
    ProjectStuff | undefined
  >();

  const projects = useProjects();

  const editProjectMutation = useMutation({
    mutationFn: (data: { pid: number; newName: string; newColor: string }) =>
      Toggl.editProjects({
        pids: [data.pid],
        edits: [
          {
            op: "replace",
            path: "/name",
            value: data.newName,
          },
          {
            op: "replace",
            path: "/color",
            value: Colors.fromHex(data.newColor)?.toggl_hex,
          },
        ],
      }),
    onMutate: (data) => {
      const projectsDB = qc.getQueryData<
        { id: number; name: string; color: string; icon: string }[]
      >(["projectsDB"]);
      if (!projectsDB) return;
      const newProjects = projectsDB.map((p) => {
        if (p.id === data.pid) {
          return { ...p, name: data.newName, color: data.newColor };
        }
        return p;
      });
      qc.setQueryData(["projectsDB"], newProjects);
    },
    onError: (error) => console.error(error),
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["projectsToggl"],
      });
    },
  });

  const onEditDone = (project: ProjectStuff) => {
    editProjectMutation.mutate({
      pid: project.id,
      newName: project.name,
      newColor: project.color,
    });
    setProjectModalOpen(false);
  };

  return (
    <>
      {projectModalOpen && (
        <ProjectModal
          onCancel={() => setProjectModalOpen(false)}
          onDone={onEditDone}
          defaultProject={selectedProject}
        />
      )}
      <FlatList
        data={projects}
        renderItem={({ item }) => (
          <Project
            project={{ ...item, icon: "" }}
            onPress={() => {
              setSelectedProject({ ...item, icon: "" });
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
          className="h-12 w-12 rounded-full"
          style={{ backgroundColor: props.project.color }}
        />
        <Text className="text-lg">{props.project.name}</Text>
      </View>
    </TouchableNativeFeedback>
  );
}

function ProjectModal(props: {
  onCancel?: () => void;
  onDone?: (p: ProjectStuff) => void;
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
            className="pb flex-grow"
            options={iconOptions}
            value={icon}
            onChange={setIcon}
            placeholder="Icon"
          />
        </View>
        <View className="w-full items-center justify-center">
          <Text className="p-4 text-lg font-bold color-red-600">
            Delete Project
          </Text>
        </View>
      </View>
    </BottomSheet>
  );
}
