import { Data } from "./data";
import { Toggl, TogglConfig } from "./toggl";
import Database from "./db";
import { Dates } from "@/utils/dates";

const now = new Date();
const yesterday = Dates.daysAgo(1);
const ereyesterday = Dates.daysAgo(2);
const nowString = Dates.toISOExtended(now);
const yesterdayString = Dates.toISOExtended(yesterday);
const ereyesterdayString = Dates.toISOExtended(ereyesterday);

beforeAll(async () => {
  TogglConfig.disabled = false;
  TogglConfig.workspace = process.env.TOGGL_TEST_WORKSPACE || null;
  TogglConfig.token = process.env.TOGGL_TEST_API_KEY || null;

  const current = await Toggl.Entries.getCurrent();
  console.log(current);

  const entries = await Toggl.Entries.getSince(ereyesterdayString);
  entries.forEach(async (e) => {
    console.log(e);
    await Toggl.Entries.delete(e.id);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  await Database.Manage.dropAllTablesAsync();
  await Database.Manage.initializeDBAsync();
  await Data.Entries.sync();
});

describe("Entries", () => {
  it("can get and create entries when online", async () => {
    const entries = await Data.Entries.getSince(yesterdayString);
    expect(entries).toBeDefined();
    expect(entries.length).toBe(0);

    const newEntry1 = await Data.Entries.create({
      start: yesterdayString,
      stop: nowString,
      description: "Entry 1",
      tags: ["Automated Testing"],
    });
    expect(newEntry1).toBeDefined();
    expect(newEntry1.id).toBeGreaterThan(0);

    await Data.Entries.sync();
    const entries2 = await Data.Entries.getSince(yesterdayString);
    expect(entries2).toBeDefined();
    expect(entries2.length).toBe(1);
    expect(entries2[0].id).toBe(newEntry1.id);
    expect(entries2[0].description).toBe("Entry 1");
    expect(entries2[0].duration).toBe(60 * 60 * 24);
  });

  it("can get and create entries when offline and sync later", async () => {
    TogglConfig.disabled = true;

    await expect(
      Data.Entries.create({
        start: yesterdayString,
        stop: nowString,
        description: "Entry 2",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();

    const entries = await Data.Entries.getSince(yesterdayString);
    expect(entries).toBeDefined();
    expect(entries.length).toBe(2);
    const foundEntry2 = entries.find((e) => e.description === "Entry 2");
    expect(foundEntry2).toBeDefined();
    expect(foundEntry2!.description).toBe("Entry 2");
    expect(foundEntry2!.duration).toBe(60 * 60 * 24);
    expect(foundEntry2!.id).toBeLessThan(0);

    TogglConfig.disabled = false;
    await Data.Entries.sync();

    const entries2 = await Data.Entries.getSince(yesterdayString);
    expect(entries2).toBeDefined();
    expect(entries2.length).toBe(2);
    const foundEntry2Online = entries2.find((e) => e.description === "Entry 2");
    expect(foundEntry2Online).toBeDefined();
    expect(foundEntry2Online!.description).toBe("Entry 2");
    expect(foundEntry2Online!.duration).toBe(60 * 60 * 24);
    expect(foundEntry2Online!.id).toBeGreaterThan(0);
  });

  it("can recieve new entries made from Toggl", async () => {
    const newEntry3 = await Toggl.Entries.create({
      start: yesterdayString,
      stop: nowString,
      description: "Entry 3",
      tags: ["Automated Testing"],
      project_id: null,
      at: "", // ignored
      duration: -1, // ignored
      id: -1, // ignored
    });
    expect(newEntry3).toBeDefined();

    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    expect(entries.length).toBe(3);
    const foundEntry3 = entries.find((e) => e.id === newEntry3.id);
    expect(foundEntry3).toBeDefined();
    expect(foundEntry3!.description).toBe("Entry 3");
    expect(foundEntry3!.duration).toBe(60 * 60 * 24);
  });

  it("can update entries online", async () => {
    const entries = await Data.Entries.getSince(yesterdayString);
    const editing = entries[0];
    const edited = await Data.Entries.edit({
      ...editing,
      tags: ["Automated Testing", "Edited"],
    });
    expect(edited).toBeDefined();
    expect(edited.tags).toContain("Edited");
    const entries2 = await Data.Entries.getSince(yesterdayString);
    const edited2 = entries2.find((e) => e.id === editing.id);
    expect(edited2).toBeDefined();
    expect(edited2!.tags).toContain("Edited");
    expect(edited2!.description).toBe(editing.description);
  });

  it("can update entries offline and sync later", async () => {
    TogglConfig.disabled = true;

    const entries = await Data.Entries.getSince(yesterdayString);
    const editing = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(editing).toBeDefined();
    await expect(
      Data.Entries.edit({
        ...editing!,
        tags: ["Automated Testing", "Edited Offline"],
      }),
    ).rejects.toThrow();

    const entries2 = await Data.Entries.getSince(yesterdayString);
    const edited = entries2.find((e) => e.id === editing!.id);
    expect(edited).toBeDefined();
    expect(edited!.tags).toContain("Edited Offline");
    expect(edited!.description).toBe(editing!.description);

    TogglConfig.disabled = false;
    await Data.Entries.sync();

    const entries3 = await Data.Entries.getSince(yesterdayString);
    const edited2 = entries3.find((e) => e.id === editing!.id);
    expect(edited2).toBeDefined();
    expect(edited2!.tags).toContain("Edited Offline");
    expect(edited2!.description).toBe(editing!.description);
  });

  it("can update entries that have been updated on toggl", async () => {
    const entries = await Data.Entries.getSince(yesterdayString);
    const editing = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(editing).toBeDefined();
    const edited = await Toggl.Entries.edit({
      ...editing!,
      tags: ["Automated Testing", "Edited on Toggl"],
    });
    expect(edited).toBeDefined();

    await Data.Entries.sync();

    const entries2 = await Data.Entries.getSince(yesterdayString);
    const edited2 = entries2.find((e) => e.id === editing!.id);
    expect(edited2).toBeDefined();
    expect(edited2!.tags).toContain("Edited on Toggl");
    expect(edited2!.description).toBe(editing!.description);
  });

  it("can delete entries online", async () => {
    const entries = await Data.Entries.getSince(yesterdayString);
    const deleting = entries[0];
    await Data.Entries.delete(deleting.id);

    await Data.Entries.sync();

    const entries2 = await Data.Entries.getSince(yesterdayString);
    const deleted = entries2.find((e) => e.id === deleting.id);
    expect(deleted).toBeUndefined();

    const togglEntries = await Toggl.Entries.getSince(yesterdayString);
    const togglDeleted = togglEntries.find((e) => e.id === deleting.id);
    expect(togglDeleted).toBeUndefined();
  });

  it("can delete entries offline and sync later", async () => {
    TogglConfig.disabled = true;

    const entries = await Data.Entries.getSince(yesterdayString);
    const deleting = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(deleting).toBeDefined();
    await expect(Data.Entries.delete(deleting!.id)).rejects.toThrow();

    const entries2 = await Data.Entries.getSince(yesterdayString);
    const deleted = entries2.find((e) => e.id === deleting!.id);
    expect(deleted).toBeUndefined();

    TogglConfig.disabled = false;
    await Data.Entries.sync();

    const entries3 = await Data.Entries.getSince(yesterdayString);
    const deleted2 = entries3.find((e) => e.id === deleting!.id);
    expect(deleted2).toBeUndefined();

    const togglEntries = await Toggl.Entries.getSince(yesterdayString);
    const togglDeleted = togglEntries.find((e) => e.id === deleting!.id);
    expect(togglDeleted).toBeUndefined();
  });

  it("can delete entries that have been deleted on toggl", async () => {
    const entries = await Data.Entries.getSince(yesterdayString);
    const deleting = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(deleting).toBeDefined();
    await Toggl.Entries.delete(deleting!.id);

    await Data.Entries.sync();

    const entries2 = await Data.Entries.getSince(yesterdayString);
    const deleted = entries2.find((e) => e.id === deleting!.id);
    expect(deleted).toBeUndefined;
  });

  it("can edit and delete entries that only exist locally", async () => {
    TogglConfig.disabled = true;

    await expect(
      Data.Entries.create({
        start: yesterdayString,
        stop: nowString,
        description: "Local Entry",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();

    const entries = await Data.Entries.getSince(yesterdayString);
    const editing = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(editing).toBeDefined();
    expect(editing!.id).toBeLessThan(0);
    expect(editing!.description).toBe("Local Entry");

    await expect(
      Data.Entries.edit({
        ...editing!,
        tags: ["Automated Testing", "Edited Locally"],
      }),
    ).rejects.toThrow();

    const entries2 = await Data.Entries.getSince(yesterdayString);
    const edited = entries2.find((e) => e.id === editing!.id);
    expect(edited).toBeDefined();
    expect(edited!.tags).toContain("Edited Locally");
    expect(edited!.description).toBe("Local Entry");

    await expect(Data.Entries.delete(editing!.id)).rejects.toThrow();

    const entries3 = await Data.Entries.getSince(yesterdayString);
    const deleted = entries3.find((e) => e.id === editing!.id);
    expect(deleted).toBeUndefined();
    expect(entries3.length).toBe(entries2.length - 1);

    TogglConfig.disabled = false;
  });

  it("can start entries online", async () => {
    const ongoing = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      description: "Ongoing Entry 1",
      tags: ["Automated Testing"],
    });
    expect(ongoing).toBeDefined();
    expect(ongoing.id).toBeGreaterThan(0);
    expect(ongoing.stop).toBeNull();

    const localCurrent = await Data.Entries.getCurrent();
    expect(localCurrent).toBeDefined();
    expect(localCurrent!.id).toBe(ongoing.id);
    expect(localCurrent!.description).toBe("Ongoing Entry 1");
    expect(localCurrent!.stop).toBeNull();

    const togglCurrent = await Toggl.Entries.getCurrent();
    expect(togglCurrent).toBeDefined();
    expect(togglCurrent!.id).toBe(ongoing.id);
    expect(togglCurrent!.description).toBe("Ongoing Entry 1");
    expect(togglCurrent!.stop).toBeNull();
  });

  it("can stop entries online", async () => {
    await Data.Entries.stopCurrent();
    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing = entries.find((e) => e.description === "Ongoing Entry 1");
    expect(ongoing).toBeDefined();
    expect(ongoing!.stop).toBeDefined();

    const localCurrent = await Data.Entries.getCurrent();
    expect(localCurrent).toBeUndefined();

    const togglCurrent = await Toggl.Entries.getCurrent();
    expect(togglCurrent).toBeUndefined();

    await Data.Entries.delete(ongoing!.id);
  });

  it("can start entries offline and sync later", async () => {
    TogglConfig.disabled = true;

    await expect(
      Data.Entries.create({
        start: Dates.toISOExtended(Dates.secondsAgo(30)),
        description: "Ongoing Entry 2",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();
    const ongoing = await Data.Entries.getCurrent();
    expect(ongoing).toBeDefined();
    expect(ongoing!.id).toBeLessThan(0);
    expect(ongoing!.stop).toBeNull();

    TogglConfig.disabled = false;
    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing2 = entries.find((e) => e.description === "Ongoing Entry 2");
    expect(ongoing2).toBeDefined();
    expect(ongoing2!.id).toBeGreaterThan(0);
    expect(ongoing2!.stop).toBeNull();

    const toggl = await Toggl.Entries.getSince(yesterdayString);
    const togglOngoing = toggl.find((e) => e.description === "Ongoing Entry 2");
    expect(togglOngoing).toBeDefined();
    expect(togglOngoing!.id).toBe(ongoing2!.id);
    expect(togglOngoing!.stop).toBeNull();

    await Data.Entries.delete(ongoing2!.id);
  });

  it("can create ongoing entries that have been started on toggl", async () => {
    const ongoing = await Toggl.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      stop: null,
      description: "Ongoing Entry 3",
      tags: ["Automated Testing"],
      project_id: null,
      at: "", // ignored
      duration: -1, // ignored
      id: -1, // ignored
    });
    expect(ongoing).toBeDefined();
    expect(ongoing.id).toBeGreaterThan(0);
    expect(ongoing.stop).toBeNull();

    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing2 = entries.find((e) => e.description === "Ongoing Entry 3");
    expect(ongoing2).toBeDefined();
    expect(ongoing2!.id).toBe(ongoing.id);
    expect(ongoing2!.stop).toBeNull();

    const toggl = await Toggl.Entries.getSince(yesterdayString);
    const togglOngoing = toggl.find((e) => e.description === "Ongoing Entry 3");
    expect(togglOngoing).toBeDefined();
    expect(togglOngoing!.id).toBe(ongoing.id);
    expect(togglOngoing!.stop).toBeNull();

    await Data.Entries.delete(ongoing2!.id);
  });

  it("can start entries online when one is ongoing", async () => {
    const ongoing = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      description: "Ongoing Entry 4",
      tags: ["Automated Testing"],
    });
    expect(ongoing).toBeDefined();
    expect(ongoing.id).toBeGreaterThan(0);
    expect(ongoing.stop).toBeNull();

    const ongoing2 = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(10)),
      description: "Ongoing Entry 5",
      tags: ["Automated Testing"],
    });
    expect(ongoing2).toBeDefined();
    expect(ongoing2.id).toBeGreaterThan(0);
    expect(ongoing2.stop).toBeNull();

    await Data.Entries.stopCurrent();
    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing3 = entries.find((e) => e.description === "Ongoing Entry 5");
    expect(ongoing3).toBeDefined();
    expect(ongoing3!.stop).toBeDefined();
    const ongoing4 = entries.find((e) => e.description === "Ongoing Entry 4");
    expect(ongoing4).toBeDefined();
    expect(ongoing4!.stop).toBeNull();
    expect(ongoing3!.stop).toBe(ongoing4!.start);

    await Data.Entries.delete(ongoing.id);
    await Data.Entries.delete(ongoing2.id);
  });

  it("can start entries offline when one is going and sync later", async () => {
    const ongoing = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      description: "Ongoing Entry 6",
      tags: ["Automated Testing"],
    });
    expect(ongoing).toBeDefined();
    expect(ongoing.id).toBeGreaterThan(0);
    expect(ongoing.stop).toBeNull();

    TogglConfig.disabled = true;

    await expect(
      Data.Entries.create({
        start: Dates.toISOExtended(Dates.secondsAgo(10)),
        description: "Ongoing Entry 7",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();
    const ongoing2 = await Data.Entries.getCurrent();
    expect(ongoing2).toBeDefined();
    expect(ongoing2!.id).toBeLessThan(0);
    expect(ongoing2!.stop).toBeNull();

    TogglConfig.disabled = false;
    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing3 = entries.find((e) => e.description === "Ongoing Entry 6");
    expect(ongoing3).toBeDefined();
    expect(ongoing3!.stop).toBeDefined();
    const ongoing4 = entries.find((e) => e.description === "Ongoing Entry 7");
    expect(ongoing4).toBeDefined();
    expect(ongoing4!.id).toBeGreaterThan(0);
    expect(ongoing4!.stop).toBeNull();
    expect(ongoing3!.stop).toBe(ongoing4!.start);

    await Data.Entries.delete(ongoing3!.id);
    await Data.Entries.delete(ongoing4!.id);
  });

  it("can start entries from ongoing toggl entries when one is ongoing", async () => {
    const ongoing = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      description: "Ongoing Entry 8",
      tags: ["Automated Testing"],
    });
    expect(ongoing).toBeDefined();
    expect(ongoing.id).toBeGreaterThan(0);
    expect(ongoing.stop).toBeNull();

    const ongoing2 = await Toggl.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(10)),
      stop: null,
      description: "Ongoing Entry 9",
      tags: ["Automated Testing"],
      project_id: null,
      at: "", // ignored
      duration: -1, // ignored
      id: -1, // ignored
    });
    expect(ongoing2).toBeDefined();
    expect(ongoing2.id).toBeGreaterThan(0);
    expect(ongoing2.stop).toBeNull();

    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing3 = entries.find((e) => e.description === "Ongoing Entry 8");
    expect(ongoing3).toBeDefined();
    expect(ongoing3!.stop).toBeDefined();
    const ongoing4 = entries.find((e) => e.description === "Ongoing Entry 9");
    expect(ongoing4).toBeDefined();
    expect(ongoing4!.stop).toBeNull();
    expect(ongoing3!.stop).toBe(ongoing4!.start);

    await Data.Entries.delete(ongoing.id);
    await Data.Entries.delete(ongoing2.id);
  });

  it("can start entries locally when one is running locally", async () => {
    TogglConfig.disabled = true;

    await expect(
      Data.Entries.create({
        start: Dates.toISOExtended(Dates.secondsAgo(30)),
        description: "Ongoing Entry 10",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();
    const ongoing = await Data.Entries.getCurrent();
    expect(ongoing).toBeDefined();
    expect(ongoing!.id).toBeLessThan(0);
    expect(ongoing!.stop).toBeNull();

    await expect(
      Data.Entries.create({
        start: Dates.toISOExtended(Dates.secondsAgo(10)),
        description: "Ongoing Entry 11",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();
    const ongoing2 = await Data.Entries.getCurrent();
    expect(ongoing2).toBeDefined();
    expect(ongoing2!.id).toBeLessThan(0);
    expect(ongoing2!.stop).toBeNull();

    const localEntries = await Data.Entries.getSince(yesterdayString);
    const ongoing3 = localEntries.find(
      (e) => e.description === "Ongoing Entry 10",
    );
    expect(ongoing3).toBeDefined();
    const ongoing4 = localEntries.find(
      (e) => e.description === "Ongoing Entry 11",
    );
    expect(ongoing4).toBeDefined();
    expect(ongoing3!.stop).toBe(ongoing4!.start);

    TogglConfig.disabled = false;
    Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing5 = entries.find((e) => e.description === "Ongoing Entry 10");
    expect(ongoing5).toBeDefined();
    expect(ongoing5!.id).toBeGreaterThan(0);
    const ongoing6 = entries.find((e) => e.description === "Ongoing Entry 11");
    expect(ongoing6).toBeDefined();
    expect(ongoing6!.id).toBeGreaterThan(0);
    expect(ongoing5!.stop).toBe(ongoing6!.start);

    await Data.Entries.delete(ongoing5!.id);
    await Data.Entries.delete(ongoing6!.id);
  });
});
