import Database from "@/apis/db";
import Toggl from "@/apis/toggl";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function useDeleteProject() {
  const qc = useQueryClient();

  const deleteProjectDBMutation = useMutation({
    mutationFn: Database.deleteProject,
    onMutate: (id) => {
      const projectsDB = qc.getQueryData<
        { id: number; name: string; color: string; icon: string }[]
      >(["projectsDB"]);
      if (!projectsDB) return;
      const newProjects = projectsDB.filter((p) => p.id !== id);
      qc.setQueryData(["projectsDB"], newProjects);
      return { oldProjects: projectsDB };
    },
    onError: (error, variables, context) => {
      console.log(error);
      qc.setQueryData(["projectsDB"], context);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["projectsDB"],
      });
    },
  });

  const deleteProjectTogglMutation = useMutation({
    mutationFn: Toggl.deleteProject,
    onMutate: (id) => {
      const projectsToggl = qc.getQueryData<
        {
          id: number;
          name: string;
          color: string;
        }[]
      >(["projectsToggl"]);
      if (!projectsToggl) return;
      const newProjects = projectsToggl.filter((p) => p.id !== id);
      qc.setQueryData(["projectsToggl"], newProjects);
      return { oldProjects: projectsToggl };
    },
    onError: (error, variables, context) => {
      console.log(error);
      qc.setQueryData(["projectsToggl"], context);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["projectsToggl"],
      });
    },
  });

  return { deleteProjectDBMutation, deleteProjectTogglMutation };
}
