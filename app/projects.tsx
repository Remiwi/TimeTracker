import { Data } from "@/apis/data";
import { Project } from "@/apis/types";
import BottomSheet from "@/components/BottomSheet";
import ColorSelector from "@/components/ColorSelector";
import MyDropDown from "@/components/DropDown";
import StyledTextInput from "@/components/TextInput";
import Colors, { colors } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Text, TouchableNativeFeedback, View } from "react-native";

export default function Page() {
  const qc = useQueryClient();

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: Data.Projects.getAll,
    refetchInterval: 10_000,
  });
  const createProjectMutation = useMutation({
    mutationFn: Data.Projects.create,
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
  const editProjectMutation = useMutation({
    mutationFn: Data.Projects.edit,
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
  const deleteProjectMutation = useMutation({
    mutationFn: Data.Projects.delete,
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: Data.Projects.sync,
    onError: (err) => {
      console.error(err);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <>
      {projectModalOpen && (
        <ProjectModal
          onCancel={() => setProjectModalOpen(false)}
          onCreate={(project) => {
            createProjectMutation.mutate(project);
            setProjectModalOpen(false);
          }}
          onEdit={(project) => {
            editProjectMutation.mutate(project);
            setProjectModalOpen(false);
          }}
          onDelete={(id: number) => {
            deleteProjectMutation.mutate(id);
            setProjectModalOpen(false);
          }}
          defaultProject={selectedProject}
        />
      )}
      {!projectModalOpen && (
        <FABs
          onAdd={() => {
            setSelectedProject(undefined);
            setProjectModalOpen(true);
          }}
          onSync={() => {
            projectsQuery.refetch();
            syncMutation.mutate();
          }}
        />
      )}
      <FlatList
        data={projectsQuery.data}
        renderItem={({ item }) => (
          <ProjectRow
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

function ProjectRow(props: { project: Project; onPress?: () => void }) {
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
  onCreate?: (p: Project) => void;
  onEdit?: (p: Project) => void;
  onDelete?: (id: number) => void;
  defaultProject?: Project;
}) {
  const [name, setName] = useState(props.defaultProject?.name || "");
  const [color, setColor] = useState(
    props.defaultProject?.color || Colors.random().toggl_hex,
  );
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

  const onDone = () => {
    if (props.defaultProject === undefined) {
      props.onCreate?.({
        id: 0, // Id should be ignored for creation anyways
        name,
        color,
        icon,
        at: "never",
        active: true,
      });
    } else {
      props.onEdit?.({
        ...props.defaultProject,
        name,
        color,
        icon,
      });
    }
  };

  const onDelete = () => {
    if (props.defaultProject !== undefined) {
      props.onDelete?.(props.defaultProject.id);
    }
  };

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
            <TouchableNativeFeedback onPress={onDone}>
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
            colors={colors.map((c) => c.toggl_hex)}
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
        {props.defaultProject && (
          <View className="w-full items-center justify-center pb-2">
            <View className="overflow-hidden rounded-full">
              <TouchableNativeFeedback onPress={onDelete}>
                <View className="p-4 px-6">
                  <Text className="text-lg font-bold color-red-600">
                    Delete Project
                  </Text>
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
        )}
        {!props.defaultProject && <View className="h-16" />}
      </View>
    </BottomSheet>
  );
}

function FABs(props: { onAdd?: () => void; onSync?: () => void }) {
  return (
    <View className="absolute bottom-5 right-5 z-50 flex items-center gap-4">
      <View className="flex flex-row-reverse items-end justify-center gap-4">
        <View className="flex h-20 w-20 overflow-hidden rounded-full shadow-lg shadow-slate-950">
          <TouchableNativeFeedback onPress={props.onAdd}>
            <View className="h-full w-full items-center justify-center bg-red-500">
              <MaterialCommunityIcons name="plus" color="white" size={52} />
            </View>
          </TouchableNativeFeedback>
        </View>
        <View className="flex h-12 w-12 overflow-hidden rounded-full shadow-lg shadow-slate-950">
          <TouchableNativeFeedback onPress={props.onSync}>
            <View className="h-full w-full items-center justify-center bg-gray-600">
              <MaterialCommunityIcons name="sync" color="white" size={24} />
            </View>
          </TouchableNativeFeedback>
        </View>
      </View>
    </View>
  );
}
