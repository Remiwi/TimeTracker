export type TogglProject = {
  id: number;
  name: string;
  color: string;
  created_at: string;
  at: string;
  active: boolean;
};

export type Project = TogglProject & {
  icon: string;
};

export type DBProject = Project & {
  to_delete: boolean;
};
