import * as SecureStore from "expo-secure-store";
import { encode } from "base-64";
import { Temporal } from "@js-temporal/polyfill";

const MY_WORKSPACE = 5930509;

const Toggl = {
  getCurrentTimeEntry: async () => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(
      "https://api.track.toggl.com/api/v9/me/time_entries/current",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json() as Promise<{
      id: number;
      description: string | null;
      project_id: number | null;
      project_name: string | null;
      project_color: string | null;
      start: string;
      stop: string | null;
      duration: number;
      tags: string[];
    } | null>;
  },

  startTimeEntry: async (data: {
    description: string;
    projectID: number;
    tags: string[];
  }) => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/time_entries`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
        body: JSON.stringify({
          description: data.description,
          project_id: data.projectID !== -1 ? data.projectID : null,
          tags: data.tags,
          created_with: "Indev interface app",
          workspace_id: MY_WORKSPACE,
          duration: -1,
          start: Temporal.Now.plainDateTimeISO("UTC").toString() + "Z",
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },

  stopCurrentTimeEntry: async () => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const id = await Toggl.getCurrentTimeEntry().then((entry) => entry?.id);
    if (!id) {
      throw new Error("No time entry found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/time_entries/${id}/stop`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },

  deleteCurrentTimeEntry: async () => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const id = await Toggl.getCurrentTimeEntry().then((entry) => entry?.id);
    if (!id) {
      throw new Error("No time entry found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/time_entries/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.status;
  },

  getLastFinishedTimeEntry: async () => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(
      "https://api.track.toggl.com/api/v9/me/time_entries",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    const entries = await res.json();
    const lastFinishedIdx = entries[0].stop === null ? 1 : 0;
    return entries[lastFinishedIdx] as {
      id: number;
      stop: string;
    };
  },

  setCurrentStartToPrevStop: async () => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const lastFinished = await Toggl.getLastFinishedTimeEntry();
    const id = await Toggl.getCurrentTimeEntry().then((entry) => entry?.id);
    if (!id) {
      throw new Error("No time entry found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/time_entries/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({ start: lastFinished.stop }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },

  getProjects: async () => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/projects`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json() as Promise<
      {
        id: number;
        name: string;
        color: string;
      }[]
    >;
  },

  editProjects: async (data: {
    pids: number[];
    edits: { op: "add" | "remove" | "replace"; path: string; value: any }[];
  }) => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/projects/${data.pids.join(",")}`,
      {
        method: "PATCH",
        body: JSON.stringify(data.edits),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },

  createProject: async (data: { name: string; color: string }) => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/projects`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
        body: JSON.stringify({ name: data.name, color: data.color }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },

  deleteProject: async (id: number) => {
    const token = await SecureStore.getItemAsync("togglToken");
    if (!token) {
      throw new Error("No token found");
    }

    const res = await fetch(
      `https://api.track.toggl.com/api/v9/workspaces/${MY_WORKSPACE}/projects/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${encode(token + ":api_token")}`,
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    return res.json();
  },
};

export default Toggl;
