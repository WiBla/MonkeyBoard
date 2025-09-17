import { open } from "sqlite";
import sqlite3 from "sqlite3";
class DB {
  constructor() {
    this.initDB();
  }

  async initDB() {
    const db = await open({
      filename: "./data.db",
      driver: sqlite3.Database,
    });

    // users
    await db.exec(`
      CREATE TABLE IF NOT EXISTS "users" (
        "uid"	TEXT NOT NULL,
        "name"	TEXT,
        "discordId"	INTEGER,
        "apeKey"	TEXT,
        "isActive"	INTEGER,
        PRIMARY KEY("uid")
      );
    `);
    // tags
    await db.exec(`
      CREATE TABLE IF NOT EXISTS "tags" (
        "id"	TEXT NOT NULL,
        "name"	TEXT,
        "uid"	TEXT,
        PRIMARY KEY("id")
      );
    `);
    // results
    await db.exec(`
      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY NOT NULL,
        uid TEXT,
        wpm REAL,
        rawWpm REAL,
        charStats TEXT,
        acc REAL,
        mode TEXT,
        mode2 TEXT,
        timestamp INTEGER,
        restartCount INTEGER,
        incompleteTestSeconds REAL,
        testDuration REAL,
        tags TEXT,
        consistency REAL,
        keyConsistency REAL,
        language TEXT
      );
    `);

    this.db = db;
    console.log("[DB] Ready");
  }

  async close() {
    await this.db.close();
    console.log("[DB] Closed");
  }

  //=======
  // Users
  //=======

  getFirstUser() {
    try {
      return this.db.get("SELECT * from users where 1 limit 1");
    } catch (error) {
      console.error("[DB]", error);
    }
  }

  getAllUsers() {
    try {
      return this.db.all("SELECT * from users where 1 limit 100");
    } catch (error) {
      console.error("[DB]", error);
    }
  }

  async addUser(uid, name, discordId, apeKey, isActive) {
    const insertStmt = await this.db.prepare(`
    INSERT INTO users (
      uid, name, discordId, apeKey, isActive
    )
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET
    uid = excluded.uid,
    name = excluded.name,
    discordId = excluded.discordId
  `);

    try {
      await insertStmt.run(uid, name, discordId, apeKey, isActive);
    } catch (error) {
      console.error("[DB]", error);
    } finally {
      await insertStmt.finalize();
    }
  }

  async addTags(tags, uid) {
    const insertStmt = await this.db.prepare(`
      INSERT INTO tags (
        id, name, uid
      )
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
      id = excluded.id,
      name = excluded.name,
      uid = excluded.uid
    `);

    for (const tag of tags) {
      await insertStmt.run(tag._id, tag.name, uid);
    }

    await insertStmt.finalize();
    console.log("[DB] Tag(s) added");
  }

  //=========
  // Results
  //=========

  async getMostRecentTimestamp(uid) {
    try {
      const data = await this.db.get(
        "SELECT timestamp FROM results WHERE uid = ? ORDER BY timestamp DESC LIMIT 1",
        [uid],
      );
      return data?.timestamp;
    } catch (error) {
      console.error("[DB]", error);
    }
  }

  async addResults(results) {
    const insertStmt = await this.db.prepare(`
    INSERT INTO results (
      id, uid, wpm, rawWpm, charStats, acc, mode, mode2, timestamp,
      restartCount, incompleteTestSeconds, testDuration, tags,
      consistency, keyConsistency, language
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      uid = excluded.uid,
      wpm = excluded.wpm,
      rawWpm = excluded.rawWpm,
      charStats = excluded.charStats,
      acc = excluded.acc,
      mode = excluded.mode,
      mode2 = excluded.mode2,
      timestamp = excluded.timestamp,
      restartCount = excluded.restartCount,
      incompleteTestSeconds = excluded.incompleteTestSeconds,
      testDuration = excluded.testDuration,
      tags = excluded.tags,
      consistency = excluded.consistency,
      keyConsistency = excluded.keyConsistency,
      language = excluded.language;
  `);

    for (const result of results) {
      await insertStmt.run(
        result._id,
        result.uid,
        result.wpm,
        result.rawWpm,
        JSON.stringify(result.charStats ?? []),
        result.acc,
        result.mode,
        result.mode2,
        result.timestamp,
        result.restartCount,
        result.incompleteTestSeconds,
        result.testDuration,
        JSON.stringify(result.tags ?? []),
        result.consistency,
        result.keyConsistency,
        result.language,
      );
    }

    await insertStmt.finalize();
    console.log("[DB] Result(s) added");
  }
}

export default new DB();
