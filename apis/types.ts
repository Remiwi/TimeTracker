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
  project_id: number;
  description: string;
  tags: string[];
};

export type DBTemplate = Omit<Template, "tags"> & { tags: string };

// Entries

export type Entry = {
  id: 0;
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
  need_push: boolean;
  tags: string;
};
