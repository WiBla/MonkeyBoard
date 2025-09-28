import { Database } from "@db/sqlite";
import Monkey from "./monkey.ts";
import { getStartOfMonthTimestamp } from "./utils/utils.ts";

class DB {
	public db: Database;

	constructor() {
		this.db = new Database("./data.db");

		this.createTables();
		this.verifyTables();

		console.log("[DB] Ready");
	}

	createTables() {
		// users
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS "users" (
				"uid"	TEXT NOT NULL,
				"name"	TEXT,
				"discordId"	TEXT,
				"apeKey"	TEXT,
				"isActive"	INTEGER,
				PRIMARY KEY("uid")
			);
		`);
		// tags
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS "tags" (
				"id"	TEXT NOT NULL,
				"name"	TEXT,
				"uid"	TEXT,
				PRIMARY KEY("id")
			);
		`);
		// results
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS results (
				id TEXT PRIMARY KEY NOT NULL,
				uid TEXT,
				wpm REAL,
				rawWpm REAL,
				charStats TEXT,
				acc REAL,
				mode TEXT,
				mode2 TEXT,
				quoteLength INTEGER,
				timestamp INTEGER,
				restartCount INTEGER,
				incompleteTestSeconds REAL,
				afkDuration REAL,
				testDuration REAL,
				tags TEXT,
				consistency REAL,
				keyConsistency REAL,
				language TEXT,
				bailedOut INTEGER,
				blindMode INTEGER,
				lazyMode INTEGER,
				funbox TEXT,
				difficulty TEXT,
				numbers INTEGER,
				punctuation INTEGER,
				isPb INTEGER
			);
		`);
	}

	verifyTables() {
		this.ensureColumns("users", {
			uid: "TEXT NOT NULL",
			name: "TEXT",
			discordId: "TEXT",
			apeKey: "TEXT",
			isActive: "INTEGER",
		});

		this.ensureColumns("tags", {
			id: "TEXT NOT NULL",
			name: "TEXT",
			uid: "TEXT",
		});

		this.ensureColumns("results", {
			id: "TEXT PRIMARY KEY NOT NULL",
			uid: "TEXT",
			wpm: "REAL",
			rawWpm: "REAL",
			charStats: "TEXT",
			acc: "REAL",
			mode: "TEXT",
			mode2: "TEXT",
			quoteLength: "INTEGER",
			timestamp: "INTEGER",
			restartCount: "INTEGER",
			incompleteTestSeconds: "REAL",
			afkDuration: "REAL",
			testDuration: "REAL",
			tags: "TEXT",
			consistency: "REAL",
			keyConsistency: "REAL",
			language: "TEXT",
			bailedOut: "INTEGER",
			blindMode: "INTEGER",
			lazyMode: "INTEGER",
			funbox: "TEXT",
			difficulty: "TEXT",
			numbers: "INTEGER",
			punctuation: "INTEGER",
			isPb: "INTEGER",
		});
	}

	ensureColumns(table: string, columns: Record<string, string>): void {
		{
			using stmt = this.db.prepare(`PRAGMA table_info(${table})`);
			const realCols = stmt.all<{ name: string }>();

			for (const colname in columns) {
				const exists = realCols.some((c) => c.name === colname);
				// console.debug({ realCols, colname, exists });
				if (!exists) {
					console.log(`[DB] Adding missing column '${colname}' to '${table}'`);
					this.db.exec(
						`ALTER TABLE ${table} ADD COLUMN ${colname} ${columns[colname]}`,
					);
				}
			}
		}
	}

	close() {
		this.db.close();
		console.log("[DB] Closed");
	}

	//=======
	// Users
	//=======

	getAllUsers() {
		return this.db.prepare("SELECT * from users where 1 limit 100").all();
	}

	getUserByToken(token: string): User | undefined {
		{
			using stmt = this.db.prepare(`SELECT * FROM users WHERE apeKey = ?`);
			return stmt.get<User>(token);
		}
	}

	getUserByDiscordId(discordId: string): User | undefined {
		{
			using stmt = this.db.prepare(`SELECT * FROM users WHERE discordId = ?`);
			return stmt.get<User>(discordId);
		}
	}

	addUser(
		user: Monkey,
	) {
		const { uid, name, discordId, token } = user;

		if ([uid, name, discordId, token].indexOf(undefined) !== -1) {
			throw new Error(
				"[DB] Missing data to save user" +
					JSON.stringify({ uid, name, discordId, token }, null, 4),
			);
		}

		{
			using insertStmt = this.db.prepare(`
		INSERT INTO users (
			uid, name, discordId, apeKey, isActive
		)
		VALUES (:uid, :name, :discordId, :token, 1)
		ON CONFLICT(uid) DO UPDATE SET
		uid = excluded.uid,
		name = excluded.name,
		discordId = excluded.discordId
	`);

			insertStmt.run({ uid, name, discordId, token });
			console.log("[DB] User saved");
		}
	}

	setActive(apeKey: string, isActive: boolean) {
		this.db.exec(
			"UPDATE users SET isActive = :isActive WHERE apeKey = :apeKey",
			{ isActive, apeKey },
		);
	}

	//======
	// Tags
	//======

	addTags(tags: Tag[]) {
		{
			using insertStmt = this.db.prepare(`
				INSERT INTO tags (
					id, name, uid
				)
				VALUES (:id, :name, :uid)
				ON CONFLICT(id) DO UPDATE SET
				id = excluded.id,
				name = excluded.name,
				uid = excluded.uid
			`);

			for (const tag of tags) {
				insertStmt.run({ id: tag._id, name: tag.name, uid: tag.uid });
			}

			console.log(`[DB] ${tags.length} Tag(s) added`);
		}
	}

	//=========
	// Results
	//=========

	addResults(results: Result[]) {
		{
			using insertStmt = this.db.prepare(`
				INSERT INTO results (
					id, uid, wpm, rawWpm, charStats, acc, mode, mode2, timestamp,
					restartCount, incompleteTestSeconds, testDuration, tags,
					consistency, keyConsistency, language, quoteLength, afkDuration,
					bailedOut, blindMode, lazyMode, funbox, difficulty, numbers, punctuation, isPb
				)
				VALUES (
					:id, :uid, :wpm, :rawWpm, :charStats, :acc, :mode, :mode2, :timestamp,
					:restartCount, :incompleteTestSeconds, :testDuration, :tags,
					:consistency, :keyConsistency, :language, :quoteLength, :afkDuration,
					:bailedOut, :blindMode, :lazyMode, :funbox, :difficulty, :numbers, :punctuation, :isPb
				)
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
					language = excluded.language,
					quoteLength = excluded.quoteLength,
					afkDuration = excluded.afkDuration,
					bailedOut = excluded.bailedOut,
					blindMode = excluded.blindMode,
					lazyMode = excluded.lazyMode,
					funbox = excluded.funbox,
					difficulty = excluded.difficulty,
					numbers = excluded.numbers,
					punctuation = excluded.punctuation,
					isPb = excluded.isPb
			`);

			let i = 0;
			for (const result of results) {
				i++;
				result.timestamp = Math.floor(result.timestamp / 1000);
				try {
					insertStmt.run({
						id: result._id ?? null,
						uid: result.uid ?? null,
						wpm: result.wpm ?? null,
						rawWpm: result.rawWpm ?? null,
						charStats: JSON.stringify(result?.charStats ?? []),
						acc: result.acc ?? null,
						mode: result.mode ?? null,
						mode2: result.mode2 ?? null,
						timestamp: isNaN(result.timestamp) ? null : result.timestamp,
						restartCount: result.restartCount ?? null,
						incompleteTestSeconds: result?.incompleteTestSeconds ?? null,
						testDuration: result.testDuration ?? null,
						tags: JSON.stringify(result?.tags ?? []),
						consistency: result.consistency ?? null,
						keyConsistency: result.keyConsistency ?? null,
						language: result?.language ?? null,
						quoteLength: result?.quoteLength ?? null,
						afkDuration: result?.afkDuration ?? null,
						bailedOut: result?.bailedOut ?? 0,
						blindMode: result?.blindMode ?? 0,
						lazyMode: result?.lazyMode ?? 0,
						funbox: JSON.stringify(result?.funbox ?? []),
						difficulty: result?.difficulty ?? null,
						numbers: result?.numbers ?? 0,
						punctuation: result?.punctuation ?? 0,
						isPb: result?.isPb ?? 0,
					});
					// console.log(`[DB] Done saving result ${i} of ${results.length}`);
				} catch (error) {
					console.error(
						`[DB] Error while inserting result ${i} of ${results.length} : `,
					);
					console.error(error);
					// console.debug(insertStmt);
					break;
				}
			}

			console.log(`[DB] ${results.length} Result(s) added`);
		}
	}

	getLeaderboard(uid?: string): LeaderboardMapped[] {
		{
			using stmt = this.db.prepare(`
WITH filtered_results AS (
  SELECT 
    r.id,
    r.uid,
    r.wpm,
    r.acc,
    r.mode,
    r.mode2,
    r.language,
    r.isPb,
    r.tags,
    CAST(r.timestamp AS TEXT) AS timestamp
  FROM results r
  WHERE
    ${uid ? "r.uid = :uid AND" : ""}
    r.acc >= 95.5
    AND r.mode = 'words'
    AND (
      ((r.language IS NULL OR r.language = 'french') AND r.mode2 = '50')
      OR (r.language IN ('french_600k', 'english_450k') AND r.mode2 = '25')
    )
    AND r.lazyMode = 0
    AND (
      r.timestamp >= :start AND r.timestamp < :end
    )
),
ranked_results AS (
  SELECT 
    fr.*,
    ROW_NUMBER() OVER (
      PARTITION BY fr.uid, fr.language
      ORDER BY fr.wpm DESC
    ) AS rn
  FROM filtered_results fr
)
SELECT
  rr.id,
  u.name,
  u.discordId,
  rr.wpm,
  rr.acc,
  rr.language,
  rr.isPb,
  rr.timestamp,
  GROUP_CONCAT(t.name, ', ') AS tag_names
FROM ranked_results rr
JOIN users u ON rr.uid = u.uid
LEFT JOIN json_each(rr.tags) je
  ON json_valid(rr.tags)
LEFT JOIN tags t
  ON t.id = je.value
WHERE rr.rn = 1
GROUP BY rr.id, u.name, u.discordId, rr.wpm, rr.acc, rr.language, rr.isPb, rr.timestamp
ORDER BY rr.language DESC, rr.wpm DESC;`);

			const start = Math.floor(
				getStartOfMonthTimestamp(new Date().getMonth() - 1) / 1000,
			);
			const end = Math.floor(getStartOfMonthTimestamp() / 1000);

			console.debug(`[DB] Fetching leaderboard for ${uid ?? "all users"}`, {
				start,
				end,
			});

			const bind = uid ? { start, end, uid } : { start, end };

			return stmt.all<LeaderboardMapped>(bind).map((row) => ({
				...row,
				isPb: Boolean(row.isPb),
				time: new Date(Number(row.timestamp * 1000)).toLocaleDateString(),
			})) as LeaderboardMapped[];
		}
	}

	getMostRecentTimestamp(uid: string): number | undefined {
		{
			using stmt = this.db.prepare(
				"SELECT timestamp FROM results WHERE uid = ? ORDER BY timestamp DESC LIMIT 1",
			);

			const ts = stmt.get<{ timestamp: number }>(uid)?.timestamp;
			return ts === undefined ? ts : ts * 1000;
		}
	}
}

export default new DB();
