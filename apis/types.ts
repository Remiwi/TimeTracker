// Projects

export type TogglProject = {
  id: number;
  name: string;
  color: string;
  at: string;
  active: boolean;
};

export type Project = TogglProject & {
  icon: string;
};

export type DBProject = Project & {
  linked: boolean;
  to_delete: boolean;
};

// Templates

export type Template = {
  id: number;
  name: string;
  project_id: number | null;
  description: string;
  tags: string[];
  page: number;
  posx: number;
  posy: number;
};

export type TemplateWithProject = Template & {
  project_name: string | null;
  project_color: string | null;
  project_icon: string | null;
};

export type DBTemplate = Omit<Template, "tags"> & { tags: string };

export type DBTemplateWithProject = DBTemplate & {
  project_name: string | null;
  project_color: string | null;
  project_icon: string | null;
};

// Entries

export type Entry = {
  id: number;
  description: string | null;
  project_id: number | null;
  start: string;
  stop: string | null;
  duration: number;
  at: string;
  tags: string[];
};

export type DBEntry = Omit<Entry, "tags"> & {
  linked: boolean;
  to_delete: boolean;
  needs_push: boolean;
  tags: string;
};

export type EntryWithProject = Entry & {
  project_name: string | null;
  project_color: string | null;
  project_icon: string | null;
};

export type DBEntryWithProject = DBEntry & {
  project_name: string | null;
  project_color: string | null;
  project_icon: string | null;
};

// Workspaces

export type Workspace = {
  id: number;
  name: string;
};

// Reports

export type DBGroup = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  isGlobal: boolean; // Whether this group is owned by a report or is reusable across reports
};

export type Group = DBGroup & {
  project_ids: (number | null)[] | undefined; // If defined, entry must have one of these project_ids to be included in this group
};

export type DBReport = {
  id: number;
  name: string;
  type: "DailyBreakdown";
};

export type Report = DBReport & {
  groups: Group[];
};
