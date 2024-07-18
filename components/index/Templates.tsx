import { FlatList, Text, TouchableNativeFeedback, View } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { TemplateWithProject } from "@/apis/types";
import { useAtom } from "jotai";
import { templatePageAtom } from "@/utils/atoms";
import { useDeepest, useTemplates } from "@/hooks/templateQueries";
import { useStartTemplateMutation } from "@/hooks/entryQueries";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";
import Paginated from "@/components/Paginated";

export default function Templates(props: {
  interactionsEnabled?: boolean;
  onTemplateCreate: (pos: { x: number; y: number }) => void;
  onTemplateEdit: (t: TemplateWithProject) => void;
}) {
  const [page, setPage] = useAtom(templatePageAtom);

  const templatesQuery = useTemplates();

  const templates = templatesQuery.data || [];

  const num_pages = templates.reduce((acc, t) => Math.max(acc, t.page), 0) + 1;
  const pages: PageProps[] = Array(num_pages)
    .fill(1)
    .map((_, i) => ({
      page: i,
      templates: templates.filter((t) => t.page === i),
      small: true,
      interactionsEnabled: props.interactionsEnabled,
      onTemplateCreate: props.onTemplateCreate,
      onTemplateEdit: props.onTemplateEdit,
    }));

  return (
    <View className="h-full flex-shrink pt-6">
      <View className="h-8 flex-row items-center justify-center">
        <View className="flex-row justify-center gap-2">
          {Array(num_pages)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                className="h-2 w-2 rounded-full bg-gray-400"
                style={{
                  backgroundColor: i === page ? "#9ca3af" : "#d1d5db",
                }}
              />
            ))}
        </View>
      </View>
      {templatesQuery.isSuccess && (
        <Paginated
          onPageChange={(p) => setPage(p)}
          minPage={0}
          maxPage={num_pages - 1}
          dependencies={[templates, props.interactionsEnabled]}
          pages={pages}
          renderPage={(page) => <Page {...page} />}
        />
      )}
    </View>
  );
}

type PageProps = {
  page: number;
  small: boolean;
  templates: TemplateWithProject[];
  interactionsEnabled?: boolean;
  onTemplateCreate: (pos: { x: number; y: number }) => void;
  onTemplateEdit: (t: TemplateWithProject) => void;
};

function Page(props: PageProps) {
  const deepestPos = useDeepest(props.page);

  return (
    <View className="flex-row">
      <FlatList
        numColumns={props.small ? 3 : 2}
        key={props.small ? 3 : 2}
        scrollEnabled={props.interactionsEnabled}
        data={Array(
          (deepestPos.data && deepestPos.data.posy > 2
            ? deepestPos.data.posy + 2
            : 4) * 3,
        )}
        extraData={props.templates}
        contentContainerClassName="p-4 pb-0"
        renderItem={(data) => {
          const itemsPerRow = props.small ? 3 : 2;
          const posx = data.index % itemsPerRow;
          const posy = Math.floor(data.index / itemsPerRow);
          const template = props.templates.find(
            (t) => t.posx === posx && t.posy === posy,
          );

          return (
            <View
              className="relative h-36"
              style={{ width: props.small ? "33.3333%" : "50%" }}
            >
              {posx !== 0 && posy !== 0 && (
                <MaterialIcons
                  name="add"
                  size={12}
                  color="#cccccc"
                  className="absolute -left-1.5 -top-1.5"
                ></MaterialIcons>
              )}
              {template && (
                <Item
                  disabled={!props.interactionsEnabled}
                  isSmall={true}
                  template={template}
                  onLongPress={() => props.onTemplateEdit(template)}
                />
              )}
              {!template && (
                <TouchableWithoutFeedback
                  onLongPress={() => {
                    props.onTemplateCreate({ x: posx, y: posy });
                  }}
                >
                  <View className="h-full" />
                </TouchableWithoutFeedback>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function Item(props: {
  template: TemplateWithProject;
  onLongPress?: () => void;
  isSmall: boolean;
  disabled?: boolean;
}) {
  const displayName =
    props.template.name ||
    props.template.description ||
    props.template.project_name ||
    "Unnamed";

  const startEntryMutation = useStartTemplateMutation();

  return (
    <View className="h-full justify-center">
      <View className="overflow-hidden rounded-lg">
        <TouchableNativeFeedback
          onPress={() => {
            startEntryMutation.mutate(props.template);
          }}
          onLongPress={props.onLongPress}
          disabled={props.disabled}
        >
          <View className="items-center justify-center pb-1 pt-2">
            <View className="flex-row justify-center gap-1">
              <View className="w-4" />
              <View
                className="aspect-square w-5/12 items-center justify-center rounded-full"
                style={{
                  backgroundColor: props.template?.project_color || "#cccccc",
                }}
              >
                <MaterialCommunityIcons
                  name={(props.template.project_icon as any) || undefined}
                  size={props.isSmall ? 26 : 32}
                  color="white"
                />
              </View>
              <View className="w-4 gap-1">
                {props.template.tags.length > 0 && (
                  <MaterialCommunityIcons
                    name="tag"
                    size={12}
                    color="#bbbbbb"
                  />
                )}
              </View>
            </View>
            <Text className="pt-1">{displayName}</Text>
          </View>
        </TouchableNativeFeedback>
      </View>
    </View>
  );
}
