import ColorSelector from "@/components/ColorSelector";
import { Icon } from "@/components/Icon";
import { IconSelector } from "@/components/IconSelector";
import StyledTextInput from "@/components/TextInput";
import { useProjects } from "@/hooks/projectQueries";
import { colors } from "@/utils/colors";
import { useState } from "react";
import { Text, View, ScrollView, TouchableNativeFeedback } from "react-native";

export default function GroupConfigScreen() {
  const [name, setName] = useState("");
  const [color, setColor] = useState("black");
  const [icon, setIcon] = useState("");

  const allProjects = useProjects();
  const processed = (allProjects.data ?? []).map((p) => ({
    project: p,
    included: false,
  }));
  const [projects, setProjects] = useState(processed);

  return (
    <ScrollView>
      <View className="flex-shrink pt-4">
        <Text className="px-6 pb-2 text-2xl font-semibold">Display</Text>
        <View className="flex-row items-center px-2 py-4 pb-4">
          <View className="w-32 items-center justify-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: color }}
            >
              <Icon name={icon as any} size={40} color="white" />
            </View>
          </View>
          <StyledTextInput
            className="flex-grow"
            label="Name"
            value={name}
            onChange={(name) => setName(name)}
          />
        </View>
        <View
          className="flex-shrink flex-row px-2 pb-8"
          style={{
            height: 380,
          }}
        >
          <ColorSelector
            colors={colors.map((c) => c.toggl_hex)}
            value={color}
            onChange={(c) => setColor(c)}
            className="w-32"
          />
          <View className="h-full flex-shrink">
            <IconSelector onSelect={(icon) => setIcon(icon)} />
          </View>
        </View>
        <Text className="px-6 pb-2 text-2xl font-semibold">
          Projects Included
        </Text>
        <View>
          {projects.map((p, index) => (
            <View
              key={p.project.id}
              className="flex-row items-center border-t border-gray-200 bg-gray-50 px-2"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: p.project.color }}
              >
                <Icon name={p.project.icon as any} size={20} color="white" />
              </View>
              <Text className="flex-grow pl-2">{p.project.name}</Text>
              <CheckBox
                value={p.included}
                onChange={() => {
                  const newProjects = [...projects];
                  newProjects[index].included = !projects[index].included;
                  setProjects(newProjects);
                }}
              />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function CheckBox(props: {
  value: boolean;
  onChange(value: boolean): void;
  onStyle?: object;
  offStyle?: object;
  iconColor?: string;
}) {
  return (
    <View className="overflow-hidden rounded-full">
      <TouchableNativeFeedback onPress={() => props.onChange(!props.value)}>
        <View className="p-4">
          <View
            className={
              props.value
                ? "h-8 w-8 rounded-md border border-transparent bg-gray-300"
                : "h-8 w-8 rounded-md border border-dashed border-gray-300"
            }
            style={props.value ? props.onStyle : props.offStyle}
          >
            {props.value && (
              <View className="h-full w-full items-center justify-center">
                <Icon
                  name="material/check"
                  size={24}
                  color={props.iconColor || "#666666"}
                />
              </View>
            )}
          </View>
        </View>
      </TouchableNativeFeedback>
    </View>
  );
}
