import Colors, { colors } from "@/utils/colors";
import { Data } from "./data";
import { Toggl, TogglConfig } from "./toggl";
import Database from "./db";

beforeAll(async () => {
  TogglConfig.disabled = false;
  TogglConfig.workspace = Number(process.env.TOGGL_TEST_WORKSPACE);
  TogglConfig.token = process.env.TOGGL_TEST_API_KEY || null;
});

// describe("Toggl", () => {
//   it("has the right configs", async () => {
//     expect(TogglConfig.token).toBeDefined();
//     expect(TogglConfig.workspace).toBe(8497311);
//   });

//   it("can fetch projects", async () => {
//     const projs = await Toggl.Projects.getAll();
//     expect(projs).toEqual([]);
//   });

//   it("can create projects", async () => {
//     const proj1 = await Toggl.Projects.create({
//       name: "No Color Given",
//     });
//     const proj2 = await Toggl.Projects.create({
//       name: "Red",
//       color: Colors.fromName("red")!.toggl_hex,
//       active: false,
//     });
//     expect(proj1.name).toBe("No Color Given");
//     expect(proj2.name).toBe("Red");
//     expect(proj1.active).toBe(true);
//     expect(proj2.active).toBe(false);
//     expect(proj2.color.toUpperCase()).toMatch(
//       Colors.fromName("red")!.toggl_hex,
//     );
//     expect(proj1.at).toBeDefined();
//     expect(proj2.at).toBeDefined();

//     const projs = await Toggl.Projects.getAll();
//     expect(projs.length).toBe(2);
//     expect(projs.some((p) => p.id === proj1.id)).toBe(true);
//     expect(projs.some((p) => p.id === proj2.id)).toBe(true);
//   });

//   it("can edit projects", async () => {
//     const proj = (await Toggl.Projects.getAll())[0];
//     expect(proj).toBeDefined();

//     const edited = await Toggl.Projects.edit({
//       id: proj.id,
//       name: "Edited",
//     });
//     expect(edited.id).toBe(proj.id);
//     expect(edited.name).toBe("Edited");
//     expect(edited.color).toBe(proj.color);

//     const editedAgain = await Toggl.Projects.edit({
//       id: proj.id,
//       color: Colors.fromName("blue")!.toggl_hex,
//       name: "Blue",
//     });
//     expect(editedAgain.id).toBe(proj.id);
//     expect(editedAgain.name).toBe("Blue");
//     expect(editedAgain.color.toUpperCase()).toBe(
//       Colors.fromName("blue")!.toggl_hex,
//     );
//   });

//   it("can delete projects", async () => {
//     const projs = await Toggl.Projects.getAll();
//     let newProjs = undefined;
//     for (const proj of projs) {
//       await Toggl.Projects.delete(proj.id);
//       newProjs = await Toggl.Projects.getAll();
//       expect(newProjs.some((p) => p.id === proj.id)).toBe(false);
//     }
//     expect(newProjs).toEqual([]);
//   });
// });

describe("Data", () => {
  beforeAll(async () => {
    await Database.Manage.dropAllTablesAsync();
    await Database.Manage.initializeDBAsync();
  });

  it("can read projects", async () => {
    const projs = await Data.Projects.getAll();
    expect(projs).toEqual([]);
  });

  it("can fill projects from toggl", async () => {
    const proj1 = await Toggl.Projects.create({ name: "Project 1" });
    const proj2 = await Toggl.Projects.create({ name: "Project 2" });
    const proj3 = await Toggl.Projects.create({ name: "Project 3" });
    await Data.Projects.sync();
    const projs = await Data.Projects.getAll();
    expect(projs.length).toBe(3);
    expect(projs.some((p) => p.id === proj1.id && p.name === proj1.name)).toBe(
      true,
    );
    expect(projs.some((p) => p.id === proj2.id && p.name === proj2.name)).toBe(
      true,
    );
    expect(projs.some((p) => p.id === proj3.id && p.name === proj3.name)).toBe(
      true,
    );
  });

  it("can create projects when online", async () => {
    const proj4 = await Data.Projects.create({ name: "Project 4" });
    const projs = await Data.Projects.getAll();
    const togglProjs = await Toggl.Projects.getAll();
    expect(proj4!.id > 0);
    expect(proj4!.at).not.toBeNull();
    expect(proj4).not.toBe(null);
    expect(projs.length).toBe(4);
    expect(
      projs.some((p) => p.id === proj4!.id && p.name === proj4!.name),
    ).toBe(true);
    expect(
      togglProjs.some((p) => p.id === proj4!.id && p.name === proj4!.name),
    ).toBe(true);
  });

  it("can create projects when offline", async () => {
    TogglConfig.disabled = true;
    await expect(Data.Projects.create({ name: "Project 5" })).rejects.toThrow(
      Error("Toggl API has been programatically disabled"),
    );
    await expect(
      Data.Projects.create({
        name: "Project 6",
        color: Colors.fromName("indigo")?.toggl_hex,
        icon: "hat",
      }),
    ).rejects.toThrow(Error("Toggl API has been programatically disabled"));
    await expect(Data.Projects.create({ name: "Project 7" })).rejects.toThrow(
      Error("Toggl API has been programatically disabled"),
    );
    const localProjs = await Data.Projects.getAll();

    expect(localProjs.length).toBe(7);
    const proj5 = localProjs.find((p) => p.name === "Project 5");
    expect(proj5).toBeDefined();
    expect(proj5!.id < 0);
    const proj6 = localProjs.find((p) => p.name === "Project 6");
    expect(proj6).toBeDefined();
    expect(proj6!.id).toBe(proj5!.id - 1);
    expect(proj6!.color).toMatch(Colors.fromName("indigo")!.toggl_hex);
    expect(proj6!.icon).toMatch("hat");
  });

  it("can edit offline only projects", async () => {
    const projs = await Data.Projects.getAll();
    const proj6 = projs.find((p) => p.name === "Project 6");
    expect(proj6).toBeDefined();
    await expect(
      Data.Projects.edit({
        id: proj6!.id,
        name: "Project SEX ahaha",
        icon: "bear",
      }),
    ).rejects.toThrow(Error("Toggl API has been programatically disabled"));
    const newprojs = await Data.Projects.getAll();
    const newproj = newprojs.find((p) => p.id === proj6!.id);
    expect(newproj).toBeDefined();
    expect(newproj!.name).toMatch("Project SEX ahaha");
    expect(newproj!.icon).toMatch("bear");
    expect(newproj!.color).toMatch(Colors.fromName("indigo")!.toggl_hex);
  });

  it("can delete offline only projects", async () => {
    const projs = await Data.Projects.getAll();
    const proj7 = projs.find((p) => p.name === "Project 7");
    expect(proj7).toBeDefined();
    await expect(Data.Projects.delete(proj7!.id)).rejects.toThrow(
      Error("Toggl API has been programatically disabled"),
    );
    const newprojs = await Data.Projects.getAll();
    expect(newprojs.length).toBe(6);
    expect(newprojs.some((p) => p.id === proj7!.id)).toBe(false);
  });

  it("can sync local only projects to toggl", async () => {
    TogglConfig.disabled = false;
    await Data.Projects.sync();
    const projs = await Data.Projects.getAll();
    const togglProjs = await Toggl.Projects.getAll();
    expect(projs.length).toBe(6);
    expect(togglProjs.length).toBe(6);
    for (const proj of projs) {
      const togglProj = togglProjs.find((p) => p.id === proj.id);
      expect(togglProj).toBeDefined();
      expect(togglProj!.name).toBe(proj.name);
      expect(togglProj!.color).toBe(proj.color);
      expect(togglProj!.at).toBe(proj.at);
    }
  });

  it("can edit projects when offline, then sync", async () => {
    TogglConfig.disabled = true;
    const projs = await Data.Projects.getAll();
    const proj1 = projs.find((p) => p.name === "Project 1");
    await expect(
      Data.Projects.edit({
        id: proj1!.id,
        name: "Project 1 Edited",
        icon: "doggy",
        color: Colors.fromName("green")!.toggl_hex,
        active: false,
      }),
    ).rejects.toThrow(Error("Toggl API has been programatically disabled"));
    const editedProjs = await Data.Projects.getAll();
    const editedProj = editedProjs.find((p) => p.id === proj1!.id);
    expect(editedProj).toBeDefined();
    expect(editedProj!.name).toBe("Project 1 Edited");
    expect(editedProj!.icon).toBe("doggy");
    expect(editedProj!.color).toMatch(Colors.fromName("green")!.toggl_hex);
    expect(editedProj!.active).toBeFalsy();
    TogglConfig.disabled = false;
    await Data.Projects.sync();
    const togglProjs = await Toggl.Projects.getAll();
    const togglProj = togglProjs.find((p) => p.id === proj1!.id);
    expect(togglProj).toBeDefined();
    expect(togglProj!.name).toBe("Project 1 Edited");
    expect(togglProj!.color.toUpperCase()).toMatch(
      Colors.fromName("green")!.toggl_hex,
    );
    expect(togglProj!.active).toBe(false);
    expect(togglProjs.length).toBe(6);
    const syncedProjs = await Data.Projects.getAll();
    const syncedProj = syncedProjs.find((p) => p.id === proj1!.id);
    expect(syncedProj).toBeDefined();
    expect(syncedProj!.name).toBe("Project 1 Edited");
    expect(syncedProj!.icon).toBe("doggy");
    expect(syncedProj!.color).toMatch(Colors.fromName("green")!.toggl_hex);
    expect(syncedProj!.active).toBeFalsy();
    expect(syncedProjs.length).toBe(6);
  });

  it("can delete projects when offline, then sync", async () => {
    TogglConfig.disabled = true;
    const projs = await Data.Projects.getAll();
    const proj2 = projs.find((p) => p.name === "Project 2");
    await expect(Data.Projects.delete(proj2!.id)).rejects.toThrow(
      Error("Toggl API has been programatically disabled"),
    );
    const newProjs = await Data.Projects.getAll();
    expect(newProjs.length).toBe(5);
    expect(newProjs.some((p) => p.id === proj2!.id)).toBe(false);
    TogglConfig.disabled = false;
    await Data.Projects.sync();
    const togglProjs = await Toggl.Projects.getAll();
    expect(togglProjs.length).toBe(5);
    expect(togglProjs.some((p) => p.id === proj2!.id)).toBe(false);
    const syncedProjs = await Data.Projects.getAll();
    expect(syncedProjs.length).toBe(5);
    expect(syncedProjs.some((p) => p.id === proj2!.id)).toBe(false);
  });

  it("can edit projects on toggl, then sync", async () => {
    TogglConfig.disabled = false;
    const proj = (await Data.Projects.getAll())[0];
    expect(proj).toBeDefined();
    expect(proj.id).toBeGreaterThan(0);

    const edited = await Toggl.Projects.edit({
      id: proj.id,
      name: "Edited",
    });
    expect(edited.id).toBe(proj.id);
    expect(edited.name).toBe("Edited");

    await expect(Data.Projects.sync()).resolves.toBe(true);
    const synced = await Data.Projects.getAll();
    const syncedProj = synced.find((p) => p.id === proj.id);
    expect(syncedProj).toBeDefined();
    expect(syncedProj!.name).toBe("Edited");
  });

  it("can delete projects on toggl, then sync", async () => {
    TogglConfig.disabled = false;
    const proj = (await Data.Projects.getAll())[0];
    expect(proj).toBeDefined();
    expect(proj.id).toBeGreaterThan(0);
    await expect(Toggl.Projects.delete(proj.id)).resolves.toBeDefined();

    await expect(Data.Projects.sync()).resolves.toBe(true);
    const synced = await Data.Projects.getAll();
    expect(synced.some((p) => p.id === proj.id)).toBe(false);
  });

  it("overrides older edits with newer edits", async () => {
    TogglConfig.disabled = false;
    const proj = (await Data.Projects.getAll())[0];
    expect(proj).toBeDefined();
    expect(proj.id).toBeGreaterThan(0);
    const older = await Toggl.Projects.edit({
      id: proj.id,
      name: "Older",
      color: Colors.fromName("fuscia")!.toggl_hex,
    });
    expect(older).toBeDefined();
    expect(older.name).toBe("Older");
    expect(older.color.toUpperCase()).toMatch(
      Colors.fromName("fuscia")!.toggl_hex,
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    TogglConfig.disabled = true;
    await expect(
      Data.Projects.edit({
        id: proj.id,
        name: "Newer",
      }),
    ).rejects.toThrow(Error("Toggl API has been programatically disabled"));
    const projs = await Data.Projects.getAll();
    const newer = projs.find((p) => p.id === proj.id);
    expect(new Date(older.at) < new Date(newer!.at)).toBeTruthy();

    TogglConfig.disabled = false;
    await Data.Projects.sync();
    const synced = await Data.Projects.getAll();
    const syncedProj = synced.find((p) => p.id === proj.id);
    expect(syncedProj).toBeDefined();
    expect(syncedProj!.name).toBe("Newer");
    expect(syncedProj!.color).toMatch(proj.color);
  });

  it("Can handle multiple sync's being called at the same time", async () => {
    const sync1 = Data.Projects.sync();
    const sync2 = Data.Projects.sync();
    const sync3 = Data.Projects.sync();

    await expect(sync1).resolves.toBe(true);
    await expect(sync2).resolves.toBe(false);
    await expect(sync3).resolves.toBe(false);

    await expect(Data.Projects.sync()).resolves.toBe(true);
  });
});
