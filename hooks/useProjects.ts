import Database from "@/apis/db";
import Toggl from "@/apis/toggl";
import Colors from "@/utils/colors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function useProjects() {
  const qc = useQueryClient();

  const projectsDBQuery = useQuery({
    queryKey: ["projectsDB"],
    queryFn: Database.getProjects,
  });

  const projectsTogglQuery = useQuery({
    queryKey: ["projectsToggl"],
    queryFn: Toggl.getProjects,
  });

  const projectsDBMutation = useMutation({
    mutationFn: Database.setProjects,
    onMutate: (data) => {
      qc.setQueryData(["projectsDB"], data);
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: ["projectsDB"],
      });
    },
  });

  if (!projectsDBQuery.isSuccess) {
    return [];
  }

  if (!projectsTogglQuery.isSuccess) {
    return projectsDBQuery.data;
  }

  let difference = false;
  const projects: {
    id: number;
    name: string;
    color: string;
    icon: string;
  }[] = [];
  // make changes/deletions to known projects
  for (const dbProj of projectsDBQuery.data) {
    const dbProjCopy = { ...dbProj };
    const togglProj = projectsTogglQuery.data.find((p) => {
      return p.id === dbProjCopy.id;
    });
    // check if it was deleted in toggl
    if (!togglProj) {
      difference = true;
      // console.log("deleted project", dbProjCopy.name);
      continue;
    }
    // check if name or color has changed
    if (dbProjCopy.name !== togglProj.name) {
      difference = true;
      // console.log("changed project", dbProjCopy.name, togglProj.name);
      dbProjCopy.name = togglProj.name;
    }
    const color = Colors.fromTogglHex(togglProj.color)?.hex || "#ffffff";
    if (dbProjCopy.color !== color) {
      difference = true;
      // console.log("changed color", dbProjCopy.name, color);
      dbProjCopy.color = color;
    }
    dbProjCopy.icon = dbProj.icon;
    projects.push(dbProjCopy);
  }
  // add new projects
  for (const togglProj of projectsTogglQuery.data) {
    if (!projects.find((p) => p.id === togglProj.id)) {
      difference = true;
      // console.log(
      //   "new project",
      //   togglProj.id,
      //   projects.map((p) => p.id),
      // );
      projects.push({
        id: togglProj.id,
        name: togglProj.name,
        color: Colors.fromTogglHex(togglProj.color)?.hex || "#ffffff",
        icon: "",
      });
    }
  }

  projects.sort((a, b) => a.id - b.id);

  if (difference) {
    setTimeout(() => {
      projectsDBMutation.mutate(projects);
    }, 1000);
  }

  return projects;
}
