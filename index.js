import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

async function main() {
  const db = await open({
    filename: "./data.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      _id TEXT PRIMARY KEY,
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

  const { API_URL, BEARER_TOKEN } = process.env;

  if (!API_URL || !BEARER_TOKEN) {
    console.error("Missing API_URL or BEARER_TOKEN in .env");
    process.exit(1);
  }

  const headers = {
    Authorization: `ApeKey ${BEARER_TOKEN}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(
    API_URL + "/results?onOrAfterTimestamp=1736290800000&limit=10",
    { headers }
  );

  if (!response.ok) {
    console.error(
      "API request failed:",
      response.status,
      await response.text()
    );
    process.exit(1);
  }

  const json = await response.json();
  const results = json.data ?? [];

  if (results.length === 0) {
    console.log("No results returned from API");
  }

  const insertStmt = await db.prepare(`
    INSERT INTO results (
      _id, uid, wpm, rawWpm, charStats, acc, mode, mode2, timestamp,
      restartCount, incompleteTestSeconds, testDuration, tags,
      consistency, keyConsistency, language
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(_id) DO UPDATE SET
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
      result.language
    );
  }

  await insertStmt.finalize();
  console.log("Database updated successfully.");
  await db.close();
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
