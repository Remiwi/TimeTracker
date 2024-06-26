import Database from "@/apis/db";
import Toggl from "@/apis/toggl";
import Colors from "@/utils/colors";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useEditProjects() {
  const qc = useQueryClient();

  const editProjectDBMutation = useMutation({
    mutationFn: (data: {
      id: number;
      name: string;
      color: string;
      icon: string;
    }) => Database.editProject(data.id, data.name, data.color, data.icon),
    onMutate: (data) => {
      const projectsDB = qc.getQueryData<
        { id: number; name: string; color: string; icon: string }[]
      >(["projectsDB"]);
      if (!projectsDB) return;
      const newProjects = projectsDB.map((p) => {
        if (p.id === data.id) {
          return { ...p, name: data.name, color: data.color };
        }
        return p;
      });
      qc.setQueryData(["projectsDB"], newProjects);
      return { oldProjects: projectsDB };
    },
    onError: (error, variables, context) => {
      qc.setQueryData(["projectsDB"], context?.oldProjects);
      console.error(error);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["projectsDB"],
      });
    },
  });

  const editProjectTogglMutation = useMutation({
    mutationFn: (data: { pid: number; name: string; color: string }) =>
      Toggl.editProjects({
        pids: [data.pid],
        edits: [
          {
            op: "replace",
            path: "/name",
            value: data.name,
          },
          {
            op: "replace",
            path: "/color",
            value: Colors.fromHex(data.color)?.toggl_hex,
          },
        ],
      }),
    onMutate: (data) => {
      const projectsToggl = qc.getQueryData<
        {
          id: number;
          name: string;
          color: string;
        }[]
      >(["projectsToggl"]);
      if (!projectsToggl) return;
      const newProjects = projectsToggl.map((p) => {
        if (p.id === data.pid) {
          return {
            ...p,
            name: data.name,
            color: Colors.fromHex(data.color)?.toggl_hex,
          };
        }
        return p;
      });
      qc.setQueryData(["projectsToggl"], newProjects);
      return { oldProjects: projectsToggl };
    },
    onError: (error, variables, context) => {
      qc.setQueryData(["projectsToggl"], context?.oldProjects);
      console.error(error);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["projectsToggl"],
      });
    },
  });

  return { editProjectDBMutation, editProjectTogglMutation };
}
