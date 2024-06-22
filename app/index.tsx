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
  const [templates, setTemplates] = useState<any[]>([]);

  const small = true;
  return (
    <>
      {templateModalShown && <NewTemplateModal />}
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
              data={[...templates, 0]}
              renderItem={(data) => {
                if (data.index === templates.length) {
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
                    <ItemSmall num={data.index} />
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
              data={templates}
              renderItem={(data) => {
                return (
                  <View className="w-1/2">
                    <ItemMedium num={data.index} />
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

function ItemSmall(props: { num: number }) {
  return (
    <View className="flex h-22 px-1">
      <View className="h-14 w-14 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />
      <View className="-top-14 z-50 h-14 w-14 rounded-full bg-white p-1">
        <View className="h-full w-full rounded-full bg-blue-500" />
      </View>
      <View className="-top-21 flex h-14 w-full rounded-lg bg-white p-2 pt-1 shadow-sm shadow-slate-950">
        <Text className="self-end pb-1 text-sm">XX:XX:XX</Text>
        <Text className="text-sm">Template {props.num}</Text>
      </View>
    </View>
  );
}

function ItemMedium(props: { num: number }) {
  return (
    <View className="flex h-29 px-1">
      <View className="h-18 w-18 rounded-full bg-white p-1 shadow-sm shadow-slate-900" />
      <View className="-top-18 z-50 h-18 w-18 rounded-full bg-white p-1">
        <View className="h-full w-full rounded-full bg-green-500" />
      </View>
      <View className="-top-29 flex h-20 w-full rounded-lg bg-white p-2 pt-1 shadow-sm shadow-slate-950">
        <Text className="text-md self-end pb-6">XX:XX:XX</Text>
        <Text>Template Name {props.num}</Text>
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

function NewTemplateModal() {
  const [text, setText] = useState("");
  const [option, setOption] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  return (
    <Modal animationType="slide" transparent>
      <View
        className="flex h-full w-full items-center justify-center p-16"
        style={{ backgroundColor: "#00000088" }}
      >
        <View className="w-full rounded-xl bg-gray-50 p-4">
          <Text className="pb-4 text-xl">New Template</Text>
          <MyTextInput
            label="Input Label"
            placeholder="hi"
            value={text}
            onChange={(t) => setText(t)}
            className="pb-4"
          />
          <MyDropDown
            label="Dropdown Label"
            options={[
              "Yes",
              "No",
              "Maybe",
              "I don't know",
              "Can you repeat that question",
            ]}
            value={option}
            onChange={(t) => setOption(t)}
            className="pb-4"
          />
          <MyTagInput
            placeholder="Enter tags"
            value={tags}
            onChange={(tags) => setTags(tags)}
            className="pb-4"
          />
        </View>
      </View>
    </Modal>
  );
}
