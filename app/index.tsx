import { useState } from "react";
import { Modal, Text, TouchableNativeFeedback, View } from "react-native";
import MyDropDown from "@/components/DropDown";
import MyTextInput from "@/components/TextInput";
import MyTagInput from "@/components/TagInput";
import { Template } from "@/apis/types";
import Timer from "@/components/index/Timer";
import {
  useAddTemplateMutation,
  useDeleteTemplateMutation,
  useEditTemplateMutation,
} from "@/hooks/templateQueries";
import { useProjects } from "@/hooks/projectQueries";
import Templates from "@/components/index/Templates";

export default function Screen() {
  const [templatesEnabled, setTemplatesEnabled] = useState(true);
  const [templateModalShown, setTemplateModalShown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    Template | undefined
  >();
  const [selectedPosition, setSelectedPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const createTemplateMutation = useAddTemplateMutation();
  const editTemplateMutation = useEditTemplateMutation();
  const deleteTemplateMutation = useDeleteTemplateMutation();

  const small = true;
  return (
    <View className="bg-gray-100">
      {templateModalShown && (
        <TemplateEditModal
          defaultTemplate={selectedTemplate}
          onCancel={() => {
            setTemplateModalShown(false);
          }}
          onCreate={(template) => {
            createTemplateMutation.mutate({
              template: {
                ...template,
                posx: selectedPosition.x,
                posy: selectedPosition.y,
              },
              num_cols: small ? 3 : 2,
            });
            setTemplateModalShown(false);
          }}
          onEdit={(template) => {
            editTemplateMutation.mutate(template);
            setTemplateModalShown(false);
          }}
          onDelete={(id) => {
            deleteTemplateMutation.mutate(id);
            setTemplateModalShown(false);
          }}
        />
      )}
      <View className="relative flex h-full">
        <View className="z-50 h-52 w-full">
          <Timer
            onOpen={() => setTemplatesEnabled(false)}
            onClose={() => setTemplatesEnabled(true)}
          />
        </View>
        <Templates
          interactionsEnabled={templatesEnabled}
          onTemplateCreate={(pos) => {
            setSelectedTemplate(undefined);
            setSelectedPosition(pos);
            setTemplateModalShown(true);
          }}
          onTemplateEdit={(t) => {
            setSelectedTemplate(t);
            setTemplateModalShown(true);
          }}
        />
      </View>
    </View>
  );
}

function TemplateEditModal(props: {
  onCancel: () => void;
  onCreate: (t: Omit<Template, "id">) => void;
  onEdit: (t: Partial<Template> & { id: number }) => void;
  onDelete: (id: number) => void;
  defaultTemplate?: Template;
}) {
  const projectsQuery = useProjects();

  const [name, setName] = useState(props.defaultTemplate?.name || "");
  const [project_id, setProjectID] = useState(
    props.defaultTemplate?.project_id || null,
  );
  const [description, setDescription] = useState(
    props.defaultTemplate?.description || "",
  );
  const [tags, setTags] = useState<string[]>(props.defaultTemplate?.tags || []);

  const onDone = () => {
    if (props.defaultTemplate === undefined) {
      props.onCreate({
        name,
        project_id,
        description,
        tags,
        page: 0,
        posx: 0,
        posy: 0,
      });
    } else {
      props.onEdit({
        ...props.defaultTemplate,
        name,
        project_id,
        description,
        tags,
      });
    }
  };

  const onDelete = () => {
    if (props.defaultTemplate !== undefined) {
      props.onDelete(props.defaultTemplate.id);
    }
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
            onChange={setName}
            className="pb-2"
          />
          <View className="flex flex-grow items-center justify-center pb-4 pt-8">
            <View className="h-0.5 w-full rounded-full bg-gray-300" />
          </View>
          <Text className="pb-4 text-lg">Entry Properties</Text>
          <MyTextInput
            label="Description"
            value={description}
            onChange={setDescription}
            className="pb-2"
          />
          <MyDropDown
            placeholder="Select Project"
            options={projectsQuery.data || []}
            value={projectsQuery.data?.find((p) => p.id === project_id)}
            onChange={(item) => {
              setProjectID(item.id);
            }}
            itemToString={(item) => item.name}
            className="z-40 pb-2"
            placeholderColor={projectsQuery.isError ? "#884444" : undefined}
          />
          <MyTagInput
            placeholder="Tags"
            value={tags}
            onChange={setTags}
            className="pb-4"
          />
          <View className="flex flex-grow flex-row justify-between">
            <View className="overflow-hidden rounded-full shadow-sm shadow-slate-800">
              <TouchableNativeFeedback onPress={props.onCancel}>
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
