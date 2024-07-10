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

  const entries = await Toggl.Entries.getSince(ereyesterdayString);
  for (const entry of entries) {
    await Toggl.Entries.delete(entry.id);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

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
    expect(newEntry1.start).not.toContain("Z");

    await Data.Entries.sync();
    const entries2 = await Data.Entries.getSince(yesterdayString);
    expect(entries2).toBeDefined();
    expect(entries2.length).toBe(1);
    expect(entries2[0].id).toBe(newEntry1.id);
    expect(entries2[0].description).toBe("Entry 1");
    expect(entries2[0].duration).toBe(60 * 60 * 24);
    expect(entries2[0].start).not.toContain("Z");
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const entries = await Data.Entries.getSince(yesterdayString);
    const editing = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(editing).toBeDefined();
    const edited = await Toggl.Entries.edit({
      ...editing!,
      tags: ["Automated Testing", "Edited on Toggl"],
    });
    expect(edited).toBeDefined();
    expect(edited!.id).toBe(editing!.id);
    expect(edited!.tags).toContain("Edited on Toggl");

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

    const entries = await Data.Entries.getSinceVisible(yesterdayString);
    const deleting = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(deleting).toBeDefined();
    expect(deleting!.id).toBeGreaterThan(0);
    await expect(Data.Entries.delete(deleting!.id)).rejects.toThrow();

    const entries2 = await Data.Entries.getSinceVisible(yesterdayString);
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

    const entries = await Data.Entries.getSinceVisible(yesterdayString);
    const editing = entries.find((e) => e.tags.includes("Automated Testing"));
    expect(editing).toBeDefined();
    expect(editing!.id).toBeLessThan(0);
    expect(editing!.description).toBe("Local Entry");

    await Data.Entries.edit({
      ...editing!,
      tags: ["Automated Testing", "Edited Locally"],
    });

    const entries2 = await Data.Entries.getSinceVisible(yesterdayString);
    const edited = entries2.find((e) => e.id === editing!.id);
    expect(edited).toBeDefined();
    expect(edited!.tags).toContain("Edited Locally");
    expect(edited!.description).toBe("Local Entry");

    await Data.Entries.delete(editing!.id);

    const entries3 = await Data.Entries.getSinceVisible(yesterdayString);
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
    expect(localCurrent).toBeNull();

    const togglCurrent = await Toggl.Entries.getCurrent();
    expect(togglCurrent).toBeNull();

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
    const ongoing4a = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      description: "Ongoing Entry 4",
      tags: ["Automated Testing"],
    });
    expect(ongoing4a).toBeDefined();
    expect(ongoing4a.id).toBeGreaterThan(0);
    expect(ongoing4a.stop).toBeNull();

    const ongoing5a = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(10)),
      description: "Ongoing Entry 5",
      tags: ["Automated Testing"],
    });
    expect(ongoing5a).toBeDefined();
    expect(ongoing5a.id).toBeGreaterThan(0);
    expect(ongoing5a.stop).toBeNull();

    await Data.Entries.stopCurrent();
    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing4b = entries.find((e) => e.description === "Ongoing Entry 4");
    const ongoing5b = entries.find((e) => e.description === "Ongoing Entry 5");
    expect(ongoing5b).toBeDefined();
    expect(ongoing4b).toBeDefined();
    expect(ongoing5b!.stop).toBeDefined();
    expect(ongoing4b!.stop).toBe(ongoing5b!.start);
    expect(ongoing4b!.start).toBe(ongoing4a.start);
    expect(ongoing5b!.start).toBe(ongoing5a.start);

    await Data.Entries.delete(ongoing4a.id);
    await Data.Entries.delete(ongoing5a.id);
  });

  it("can start entries offline when one is ongoing and sync later", async () => {
    const ongoing6a = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      description: "Ongoing Entry 6",
      tags: ["Automated Testing"],
    });
    expect(ongoing6a).toBeDefined();
    expect(ongoing6a.id).toBeGreaterThan(0);
    expect(ongoing6a.stop).toBeNull();

    TogglConfig.disabled = true;

    await expect(
      Data.Entries.create({
        start: Dates.toISOExtended(Dates.secondsAgo(10)),
        description: "Ongoing Entry 7",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();
    const ongoing7a = await Data.Entries.getCurrent();
    expect(ongoing7a).toBeDefined();
    expect(ongoing7a!.id).toBeLessThan(0);
    expect(ongoing7a!.stop).toBeNull();

    TogglConfig.disabled = false;
    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing6b = entries.find((e) => e.description === "Ongoing Entry 6");
    const ongoing7b = entries.find((e) => e.description === "Ongoing Entry 7");
    expect(ongoing6b).toBeDefined();
    expect(ongoing7b).toBeDefined();
    expect(ongoing7b!.start).not.toContain("Z");
    expect(ongoing6b!.stop).toBe(ongoing7b!.start); // We set prev ongoing stop to new ongoing start
    expect(ongoing7b!.stop).toBeNull();
    expect(ongoing7b!.id).toBeGreaterThan(0);

    await Data.Entries.delete(ongoing6b!.id);
    await Data.Entries.delete(ongoing7b!.id);
  });

  it("can start entries from ongoing toggl entries when one is ongoing", async () => {
    const ongoing8a = await Data.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(30)),
      description: "Ongoing Entry 8",
      tags: ["Automated Testing"],
    });
    expect(ongoing8a).toBeDefined();
    expect(ongoing8a.id).toBeGreaterThan(0);
    expect(ongoing8a.stop).toBeNull();

    const ongoing9a = await Toggl.Entries.create({
      start: Dates.toISOExtended(Dates.secondsAgo(10)),
      stop: null,
      description: "Ongoing Entry 9",
      tags: ["Automated Testing"],
      project_id: null,
      at: "", // ignored
      duration: -1, // ignored
      id: -1, // ignored
    });
    expect(ongoing9a).toBeDefined();
    expect(ongoing9a.id).toBeGreaterThan(0);
    expect(ongoing9a.stop).toBeNull();

    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing8b = entries.find((e) => e.description === "Ongoing Entry 8");
    const ongoing9b = entries.find((e) => e.description === "Ongoing Entry 9");
    expect(ongoing8b).toBeDefined();
    expect(ongoing9b).toBeDefined();
    expect(ongoing8b!.stop).not.toBeNull(); // Toggl create stops prev ongoing based on request time, not new entry time
    expect(ongoing9b!.stop).toBeNull();

    await Data.Entries.delete(ongoing8a.id);
    await Data.Entries.delete(ongoing9a.id);
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
    const ongoing10a = await Data.Entries.getCurrent();
    expect(ongoing10a).toBeDefined();
    expect(ongoing10a!.id).toBeLessThan(0);
    expect(ongoing10a!.stop).toBeNull();

    await expect(
      Data.Entries.create({
        start: Dates.toISOExtended(Dates.secondsAgo(10)),
        description: "Ongoing Entry 11",
        tags: ["Automated Testing"],
      }),
    ).rejects.toThrow();
    const ongoing11a = await Data.Entries.getCurrent();
    expect(ongoing11a).toBeDefined();
    expect(ongoing11a!.id).toBeLessThan(0);
    expect(ongoing11a!.stop).toBeNull();

    const localEntries = await Data.Entries.getSince(yesterdayString);
    const ongoing10b = localEntries.find(
      (e) => e.description === "Ongoing Entry 10",
    );
    const ongoing11b = localEntries.find(
      (e) => e.description === "Ongoing Entry 11",
    );
    expect(ongoing10b).toBeDefined();
    expect(ongoing11b).toBeDefined();
    expect(ongoing10b!.stop).toBe(ongoing11b!.start);

    TogglConfig.disabled = false;
    await Data.Entries.sync();

    const entries = await Data.Entries.getSince(yesterdayString);
    const ongoing10c = entries.find(
      (e) => e.description === "Ongoing Entry 10",
    );
    const ongoing11c = entries.find(
      (e) => e.description === "Ongoing Entry 11",
    );
    expect(ongoing10c).toBeDefined();
    expect(ongoing11c).toBeDefined();
    expect(ongoing10c!.id).toBeGreaterThan(0);
    expect(ongoing11c!.id).toBeGreaterThan(0);
    expect(ongoing10c!.stop).toBe(ongoing11c!.start);

    await Data.Entries.delete(ongoing10c!.id);
    await Data.Entries.delete(ongoing11c!.id);
  });
});
