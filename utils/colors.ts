type Color = {
  name: string;
  hex: string;
  toggl_hex: string;
};

export const colors = [
  {
    name: "blue",
    hex: "#3b82f6",
    toggl_hex: "#0B83D9",
  },
  {
    name: "purple",
    hex: "#a855f7",
    toggl_hex: "#9E5BD9",
  },
  {
    name: "pink",
    hex: "#ec4899",
    toggl_hex: "#D94182",
  },
  {
    name: "orange",
    hex: "#f97316",
    toggl_hex: "#E36A00",
  },
  {
    name: "brown",
    hex: "#92400e",
    toggl_hex: "#BF7000",
  },
  {
    name: "lime",
    hex: "#84cc16",
    toggl_hex: "#2DA608",
  },
  {
    name: "teal",
    hex: "#14b8a6",
    toggl_hex: "#06A893",
  },
  {
    name: "beige",
    hex: "#fdba74",
    toggl_hex: "#C9806B",
  },
  {
    name: "indigo",
    hex: "#4f46e5",
    toggl_hex: "#465BB3",
  },
  {
    name: "fuscia",
    hex: "#a21caf",
    toggl_hex: "#990099",
  },
  {
    name: "yellow",
    hex: "#facc15",
    toggl_hex: "#C7AF14",
  },
  {
    name: "green",
    hex: "#3f6212",
    toggl_hex: "#566614",
  },
  {
    name: "red",
    hex: "#dc2626",
    toggl_hex: "#D92B2B",
  },
  {
    name: "gray",
    hex: "#475569",
    toggl_hex: "#525266",
  },
];

const togglHexToColor = new Map<string, Color>(
  colors.map((color) => [color.toggl_hex, color]),
);

const hexToColor = new Map<string, Color>(
  colors.map((color) => [color.hex, color]),
);

const nameToColor = new Map<string, Color>(
  colors.map((color) => [color.name, color]),
);

function fromTogglHex(togglHex: string | undefined) {
  if (togglHex === undefined) return undefined;
  return togglHexToColor.get(togglHex.toUpperCase());
}

function fromHex(hex: string | undefined) {
  if (hex === undefined) return undefined;
  return hexToColor.get(hex.toLowerCase());
}

function fromName(name: string | undefined) {
  if (name === undefined) return undefined;
  return nameToColor.get(name.toLowerCase());
}

function random() {
  return colors[Math.floor(Math.random() * colors.length)];
}

const Colors = {
  fromTogglHex,
  fromHex,
  fromName,
  random,
};

export default Colors;
