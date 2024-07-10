import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dbPromise = open({
  filename: "test.db",
  driver: sqlite3.Database,
});

export function openDatabaseSync(name: string) {
  return {
    runSync: () => {},

    runAsync: async (source: string, params: any[]) => {
      const db = await dbPromise;
      await db.run(source, params);
    },

    getAllAsync: async <T>(source: string, params: any[]) => {
      const db = await dbPromise;
      return await db.all<T[]>(source, params);
    },

    getFirstAsync: async <T>(source: string, params: any[]) => {
      const db = await dbPromise;
      return await db.get<T>(source, params);
    },

    withExclusiveTransactionAsync: async (
      callback: (tx: any) => Promise<void>,
    ) => {
      const conn = await open({
        filename: "test.db",
        driver: sqlite3.Database,
      });

      const tx = {
        getFirstAsync: async (source: string, params: any[]) => {
          return (await conn.all(source, params))[0];
        },

        runAsync: async (source: string, params: any[]) => {
          await conn.run(source, params);
        },

        getAllAsync: async (source: string, params: any[]) => {
          return await conn.all(source, params);
        },
      };

      await conn.exec("BEGIN EXCLUSIVE TRANSACTION;");
      await callback(tx)
        .then(() => {
          conn.exec("COMMIT;");
        })
        .catch((e) => {
          conn.exec("ROLLBACK;");
          throw e;
        })
        .finally(() => {
          conn.close();
        });
    },
  };
}
