import * as SecureStore from "expo-secure-store";
import { encode } from "base-64";
import { Entry, TogglProject } from "./types";

export const TogglConfig = {
  token: null as string | null,
  workspace: null as string | null,
  disabled: false,
  push_disabled: false,
};

(async () => {
  TogglConfig.token = await SecureStore.getItemAsync("togglToken");
  TogglConfig.workspace = await SecureStore.getItemAsync("togglWorkspace");
})();

export const Toggl = {
  Projects: {
    getAll: async () => {
      if (TogglConfig.disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${TogglConfig.workspace}/projects`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json() as Promise<TogglProject[]>;
    },

    create: async (project: Partial<TogglProject> & { name: string }) => {
      if (TogglConfig.disabled || TogglConfig.push_disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${TogglConfig.workspace}/projects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
          body: JSON.stringify({
            ...project,
            active:
              project.active || project.active === undefined ? true : false,
            color:
              project.color !== "" && project.color ? project.color : undefined,
            created_at: undefined,
            at: undefined,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json() as Promise<TogglProject>;
    },

    delete: async (id: number) => {
      if (TogglConfig.disabled || TogglConfig.push_disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (id < 0) {
        throw Error("This project only exists on local!");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${TogglConfig.workspace}/projects/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json();
    },

    edit: async (project: Partial<TogglProject> & { id: number }) => {
      if (TogglConfig.disabled || TogglConfig.push_disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (project.id < 0) {
        throw Error("This project only exists on local!");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${TogglConfig.workspace}/projects/${project.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...project,
            active: project.active ? true : false,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json();
    },
  },

  Entries: {
    getCurrent: async () => {
      if (TogglConfig.disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const res = await fetch(
        "https://api.track.toggl.com/api/v9/me/time_entries/current",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json() as Promise<Entry | null>;
    },

    getSince: async (startingAtOrAfter: string) => {
      if (TogglConfig.disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const end = new Date().toISOString();

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/me/time_entries?start_date=${startingAtOrAfter}&end_date=${end}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return (await res.json()) as Entry[];
    },

    create: async (
      entry: Omit<Entry, "tags"> & {
        tags?: string | string[];
      },
    ) => {
      if (TogglConfig.disabled || TogglConfig.push_disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }
      const tags =
        typeof entry.tags === "string" ? entry.tags.split(",") : entry.tags;

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${TogglConfig.workspace}/time_entries`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
          body: JSON.stringify({
            description: entry.description || null,
            project_id: entry.project_id || null,
            tags: tags || [],
            created_with: "Indev interface app",
            workspace_id: TogglConfig.workspace,
            start: entry.start,
            stop: entry.stop,
            duration: entry.duration === -1 ? -1 : undefined,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json() as Promise<Entry>;
    },

    delete: async (id: number) => {
      if (TogglConfig.disabled || TogglConfig.push_disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${TogglConfig.workspace}/time_entries/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.status;
    },

    edit: async (
      entry: Partial<Omit<Entry, "tags">> & {
        id: number;
        tags?: string | string[];
      },
    ) => {
      if (TogglConfig.disabled || TogglConfig.push_disabled) {
        throw new Error("Toggl API has been programatically disabled");
      }
      if (!TogglConfig.token) {
        throw new Error("No token found");
      }

      const tags =
        typeof entry.tags === "string" ? entry.tags.split(",") : entry.tags;

      const res = await fetch(
        `https://api.track.toggl.com/api/v9/workspaces/${TogglConfig.workspace}/time_entries/${entry.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...entry,
            tags: tags,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${encode(TogglConfig.token + ":api_token")}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      return res.json() as Promise<Entry>;
    },
  },
};
