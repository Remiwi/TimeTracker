import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { GlyphMap } from "@expo/vector-icons/build/createIconSet";

type ExtractKeys<T> = T extends GlyphMap<infer G> ? G : never;

const materialCommunityGlyphMap = MaterialCommunityIcons.getRawGlyphMap();
type MaterialCommunityKeysRaw = ExtractKeys<typeof materialCommunityGlyphMap>;
export const materialCommunityKeys = Object.keys(
  materialCommunityGlyphMap,
) as MaterialCommunityKeysRaw[];
export type MaterialCommunityKeys =
  `material-community/${MaterialCommunityKeysRaw}`;

const materialGlyphMap = MaterialIcons.getRawGlyphMap();
type MaterialKeysRaw = ExtractKeys<typeof materialGlyphMap>;
export const materialKeys = Object.keys(materialGlyphMap) as MaterialKeysRaw[];
export type MaterialKeys = `material/${MaterialKeysRaw}`;

export type IconKeys = MaterialCommunityKeys | MaterialKeys;
