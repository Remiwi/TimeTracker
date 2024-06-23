import * as SecureStore from "expo-secure-store";
import { encode } from "base-64";
import { Temporal } from "@js-temporal/polyfill";

const MY_WORKSPACE = 5930509;

const Toggl = {
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
        name: string;
        id: number;
        color: string;
      }[]
    >;
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
          project_id: data.projectID,
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
};

export default Toggl;
