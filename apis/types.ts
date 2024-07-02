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
