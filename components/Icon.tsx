import { IconKeys } from "@/utils/icons";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";

export function Icon(props: {
  name?: IconKeys;
  size?: number;
  color?: string;
}) {
  if (!props.name) {
    return null;
  }
  const size = props.size ?? 24;
  const color = props.color ?? "black";

  const [prefix, name] = props.name.split("/");
  if (prefix === "material-community") {
    return (
      <MaterialCommunityIcons name={name as any} size={size} color={color} />
    );
  }
  if (prefix === "material") {
    return <MaterialIcons name={name as any} size={size} color={color} />;
  }

  console.warn(`Invalid icon prefix "${prefix}"`);
}
