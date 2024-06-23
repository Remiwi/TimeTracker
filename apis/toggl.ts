import * as SecureStore from "expo-secure-store";
import { encode } from "base-64";

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
};

export default Toggl;
