import { useState } from "react";
import {
  FlatList,
  Modal,
  Text,
  TouchableNativeFeedback,
  View,
} from "react-native";
import MyDropDown from "@/components/DropDown";
import MyTextInput from "@/components/TextInput";
import MyTagInput from "@/components/TagInput";
import ColorSelector from "@/components/ColorSelector";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

type TemplateStuff = {
  name: string;
  project: string;
  description: string;
  tags: string[];
  color: string;
  icon: string;
};

export default function Page() {
  const [templateModalShown, setTemplateModalShown] = useState(false);
  const [templates, setTemplates] = useState<TemplateStuff[]>([]);
  const [editTemplateIdx, setEditTemplateIdx] = useState<number>(-1);

  const small = true;
  return (
    <>
      {templateModalShown && (
        <TemplateEditModal
          onCancel={() => {
            setEditTemplateIdx(-1);
            setTemplateModalShown(false);
          }}
          onDone={(t) => {
            setEditTemplateIdx(-1);
            setTemplateModalShown(false);
            if (0 <= editTemplateIdx && editTemplateIdx < templates.length) {
              const newTemplates = [...templates];
              newTemplates[editTemplateIdx] = t;
              setTemplates(newTemplates);
              return;
            }
            setTemplates([...templates, t]);
          }}
          onDelete={() => {
            setEditTemplateIdx(-1);
            setTemplateModalShown(false);
            if (0 <= editTemplateIdx && editTemplateIdx < templates.length) {
              const newTemplates = [...templates];
              newTemplates.splice(editTemplateIdx, 1);
              setTemplates(newTemplates);
            }
          }}
          defaultTemplate={
            0 <= editTemplateIdx && editTemplateIdx < templates.length
              ? templates[editTemplateIdx]
              : undefined
          }
        />
      )}
      <View className="flex h-full pt-20">
        <View className="pb-6">
          <View className="flex flex-row items-end justify-between px-4 pb-1">
            <View>
              <Text className="pb-2 text-xl font-bold">Project name</Text>
              <Text className="text-6xl">XX:XX:XX</Text>
            </View>
            <View className="aspect-square w-24 rounded-full bg-orange-500 shadow-md shadow-black" />
          </View>
          <View className="px-4">
            <Text className="font-light">Description</Text>
            <Text className="font-light italic text-gray-400">Tags</Text>
          </View>
        </View>
        <View className="h-full flex-shrink rounded-t-3xl bg-gray-100 pt-6 shadow-xl shadow-black">
          <View className="flex w-full flex-row gap-2 p-2 pb-8">
            <Folder active={true} />
            <Folder />
            <Folder />
            <Folder />
          </View>
          <View className="flex items-center justify-center pb-6">
            <View className="h-0.5 w-2/3 rounded-full bg-gray-300" />
          </View>
          {small ? (
            <FlatList
              numColumns={3}
              key={3}
              data={[...templates, 0] as (TemplateStuff | 0)[]}
              renderItem={(data) => {
                if (data.item === 0) {
                  return (
                    <View className="h-22 w-1/3 overflow-hidden rounded-lg bg-gray-50">
                      <TouchableNativeFeedback
                        onPress={() => setTemplateModalShown(true)}
                      >
                        <View className="flex h-full w-full justify-center rounded-lg border-2 border-dashed border-gray-200">
                          <Text className="text-center text-sm text-gray-400">
                            New Template
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  );
                }

                return (
                  <View className="w-1/3">
                    <ItemSmall
                      templateStuff={data.item}
                      onLongPress={() => {
                        setEditTemplateIdx(data.index);
                        setTemplateModalShown(true);
                      }}
                    />
                  </View>
                );
              }}
              contentContainerClassName="gap-16"
              className="px-4"
            />
          ) : (
            <FlatList
              numColumns={2}
              key={2}
              data={[...templates, 0] as (TemplateStuff | 0)[]}
              renderItem={(data) => {
                if (data.item === 0) {
                  return (
                    <View className="h-29 w-1/2 overflow-hidden rounded-lg bg-gray-50">
                      <TouchableNativeFeedback
                        onPress={() => setTemplateModalShown(true)}
                      >
                        <View className="flex h-full w-full justify-center rounded-lg border-2 border-dashed border-gray-200">
                          <Text className="text-center text-sm text-gray-400">
                            New Template
                          </Text>
                        </View>
                      </TouchableNativeFeedback>
                    </View>
                  );
                }

                return (
                  <View className="w-1/2">
                    <ItemMedium templateStuff={data.item} />
                  </View>
                );
              }}
              contentContainerClassName="gap-12"
              className="px-4"
            />
          )}
        </View>
      </View>
    </>
  );
}

function ItemSmall(props: {
  templateStuff: TemplateStuff;
  onLongPress?: () => void;
}) {
  return (
    <View className="flex h-22 px-1">
      <View className="h-14 w-14 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />
      <View className="-top-14 z-50 h-14 w-14 rounded-full bg-white p-1">
        <View
          className={
            "flex h-full w-full items-center justify-center rounded-full " +
            props.templateStuff.color
          }
        >
          <MaterialCommunityIcons
            name={props.templateStuff.icon as any}
            size={24}
            color="white"
          />
        </View>
      </View>
      <View className="-top-21 h-14 w-full overflow-hidden rounded-lg bg-white shadow-sm shadow-slate-950">
        <TouchableNativeFeedback onLongPress={props.onLongPress}>
          <View className="flex p-2 pt-1">
            <Text className="self-end pb-1 text-sm">XX:XX:XX</Text>
            <Text className="text-sm">{props.templateStuff.name}</Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  );
}

function ItemMedium(props: {
  templateStuff: TemplateStuff;
  onLongPress?: () => void;
}) {
  return (
    <View className="flex h-29 px-1">
      <View className="h-18 w-18 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />

      <View className="-top-18 z-50 h-18 w-18 rounded-full bg-white p-1">
        <View
          className={
            "flex h-full w-full items-center justify-center rounded-full " +
            props.templateStuff.color
          }
        >
          <MaterialCommunityIcons
            name={props.templateStuff.icon as any}
            size={32}
            color="white"
          />
        </View>
      </View>
      <View className="-top-29 h-20 w-full overflow-hidden rounded-lg bg-white shadow-sm shadow-slate-950">
        <TouchableNativeFeedback onLongPress={props.onLongPress}>
          <View className="flex p-2 pt-1">
            <Text className="text-md self-end pb-6">XX:XX:XX</Text>
            <Text>{props.templateStuff.name}</Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  );
}

function Folder(props: { active?: boolean }) {
  const inactiveClassName = "bg-white shadow-sm";
  const activeClassName = "bg-gray-200 shadow-inner";

  return (
    <View
      className={
        "flex h-24 w-32 items-center justify-center rounded-2xl pt-1 shadow-black " +
        (props.active ? activeClassName : inactiveClassName)
      }
    >
      <View className="h-16 w-16 bg-black" />
      <Text>Folder name</Text>
    </View>
  );
}

function TemplateEditModal(props: {
  onCancel: () => void;
  onDone: (t: TemplateStuff) => void;
  onDelete: () => void;
  defaultTemplate?: TemplateStuff;
}) {
  const [name, setName] = useState(props.defaultTemplate?.name || "");
  const [color, setColor] = useState(
    props.defaultTemplate?.color || "bg-indigo-600",
  );
  const [iconName, setIconName] = useState(props.defaultTemplate?.icon || "");
  const [project, setProject] = useState(props.defaultTemplate?.project || "");
  const [description, setDescription] = useState(
    props.defaultTemplate?.description || "",
  );
  const [tags, setTags] = useState<string[]>(props.defaultTemplate?.tags || []);

  const iconOptions = [
    "music-note",
    "laptop",
    "dumbbell",
    "filmstrip",
    "book",
    "shopping",
    "wizard-hat",
  ];

  const projectOptions = ["Project 1", "Project 2", "Project 3"];

  const onCancel = () => {
    setName("");
    setColor("bg-indigo-600");
    setIconName("");
    setProject("");
    setDescription("");
    setTags([]);
    props.onCancel();
  };
  const onDone = () => {
    setName("");
    setColor("bg-indigo-600");
    setIconName("");
    setProject("");
    setDescription("");
    setTags([]);

    if (name === "") return;
    if (iconName === "") return;
    if (project === "") return;

    props.onDone({
      name,
      color,
      icon: iconName,
      project,
      description,
      tags,
    });
  };
  const onDelete = () => {
    setName("");
    setColor("bg-indigo-600");
    setIconName("");
    setProject("");
    setDescription("");
    setTags([]);
    props.onDelete();
  };

  return (
    <Modal animationType="slide" transparent>
      <View
        className="flex h-full w-full items-center justify-center p-16"
        style={{ backgroundColor: "#00000088" }}
      >
        <View className="w-full rounded-2xl bg-gray-50 p-4">
          {props.defaultTemplate !== undefined && (
            <View className="flex items-center pb-2">
              <View className="w-44 overflow-hidden rounded-full shadow-sm shadow-slate-800">
                <TouchableNativeFeedback onPress={onDelete}>
                  <View className="flex w-full items-center rounded-full bg-slate-100 p-2">
                    <Text className="font-bold">Delete Template</Text>
                  </View>
                </TouchableNativeFeedback>
              </View>
            </View>
          )}
          <Text className="pb-4 text-xl">Template Properties</Text>
          <MyTextInput
            label="Name"
            placeholder=""
            value={name}
            onChange={(t) => setName(t)}
            className="pb-2"
          />
          <View className="z-50 flex flex-row gap-4">
            <ColorSelector value={color} onChange={(c) => setColor(c)}>
              <MaterialCommunityIcons
                name={iconName as any}
                size={20}
                color="white"
              />
            </ColorSelector>
            <MyDropDown
              className="flex-grow"
              options={iconOptions}
              value={iconName}
              onChange={(name) => setIconName(name)}
              placeholder="Icon"
            />
          </View>
          <View className="flex flex-grow items-center justify-center pb-4 pt-8">
            <View className="h-0.5 w-full rounded-full bg-gray-300" />
          </View>
          <Text className="pb-4 text-lg">Entry Properties</Text>
          <MyTextInput
            label="Description"
            value={description}
            onChange={(t) => setDescription(t)}
            className="pb-2"
          />
          <MyDropDown
            placeholder="Project"
            options={projectOptions}
            value={project}
            onChange={(t) => {
              setProject(t);
            }}
            className="z-40 pb-2"
          />
          <MyTagInput
            placeholder="Tags"
            value={tags}
            onChange={(t) => setTags(t)}
            className="pb-4"
          />
          <View className="flex flex-grow flex-row justify-between">
            <View className="overflow-hidden rounded-full shadow-sm shadow-slate-800">
              <TouchableNativeFeedback onPress={onCancel}>
                <View className="flex w-28 items-center rounded-full bg-gray-100 p-2">
                  <Text className="font-bold">Cancel</Text>
                </View>
              </TouchableNativeFeedback>
            </View>
            <View className="overflow-hidden rounded-full shadow-sm shadow-slate-800">
              <TouchableNativeFeedback onPress={onDone}>
                <View className="flex w-28 items-center rounded-full bg-slate-200 p-2">
                  <Text className="font-bold">Done</Text>
                </View>
              </TouchableNativeFeedback>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
