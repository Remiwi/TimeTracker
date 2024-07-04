import * as SecureStore from "expo-secure-store";
import { encode } from "base-64";
import { TogglProject } from "./types";

export const TogglConfig = {
  token: null as string | null,
  workspace: 5930509,
  disabled: false,
};

(async () => {
  TogglConfig.token = await SecureStore.getItemAsync("togglToken");
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
      if (TogglConfig.disabled) {
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
      if (TogglConfig.disabled) {
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
      if (TogglConfig.disabled) {
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

  Entries: {},
};
