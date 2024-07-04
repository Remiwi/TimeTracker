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

export type Template = {
  id: number;
  name: string;
  project_id: number;
  description: string;
  tags: string[];
};

export type DBTemplate = Omit<Template, "tags"> & { tags: string };
