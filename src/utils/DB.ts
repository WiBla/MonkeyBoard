import { Database } from "@db/sqlite";
import { User } from "../types/models.d.ts";
import Monkey from "./Monkey.ts";
import { getMonthName, getStartOfMonthTimestamp, isProd } from "./utils.ts";

class DB {
	private db: Database;

	// #region Base operations
	constructor() {
		this.db = new Database(isProd ? "./data.db" : "./data-dev.db");
		console.debug(`[DB] Running in ${isProd ? "PROD" : "DEV"} mode.`);

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
				"dnt"	INTEGER DEFAULT 0,
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
			dnt: "INTEGER DEFAULT 0",
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
	// #endregion Base operations

	// #region Users
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
			uid, name, discordId, apeKey, isActive, dnt
		)
		VALUES (:uid, :name, :discordId, :token, 1, 0)
		ON CONFLICT(uid) DO UPDATE SET
		uid = excluded.uid,
		name = excluded.name,
		discordId = excluded.discordId
	`);

			insertStmt.run({ uid, name, discordId, token });
			console.log("[DB] User saved");
		}
	}

	async registerUser(
		discordId: string,
		apekey: string,
	): Promise<boolean> {
		try {
			const user = new Monkey(apekey, discordId);
			await user.completeProfileFromAPI();

			const results = await user.getResults();
			this.addResults(results);

			console.log("[DB] User registered successfully");
			return true;
		} catch (err) {
			console.error("[DB] Error while registering user", err);
			throw err;
		}
	}

	getAllUsers(ignoreDNT = false): User[] {
		const stmt = `SELECT * from users where ${
			ignoreDNT ? "1" : "dnt = 0"
		} limit 100`;
		console.debug("[DB] Getting all users, ignoreDNT is", ignoreDNT, stmt);
		return this.db.prepare(stmt).all<User>();
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

	userByDiscordIdExists(discordId: string): boolean {
		{
			using stmt = this.db.prepare(
				`SELECT COUNT(*) as count FROM users WHERE discordId = ?`,
			);
			const count = stmt.get<{ count: number }>(discordId)?.count || 0;
			return count > 0;
		}
	}

	getNameFromUID(uid: string): string {
		{
			using stmt = this.db.prepare(
				"SELECT name FROM users WHERE uid = ?",
			);
			const fetch = stmt.get<{ name: string }>(uid);

			return fetch?.name || "";
		}
	}

	async updateAll(): Promise<
		{ userCount: number; updateCount: number }
	> {
		let userCount = 0;
		let updateCount = 0;

		try {
			const users = this.getAllUsers(true);

			for (const dbUser of users) {
				try {
					userCount++;
					const user = new Monkey(dbUser.apeKey);
					const isKeyValid = await user.isKeyValid();

					if (!isKeyValid) {
						throw new Error("Invalid ApeKey for user" + dbUser.apeKey);
					}

					user.completeProfileFromDB();
					const results = await user.updateResults(true);
					user.updateTags();
					updateCount += results;
				} catch (err) {
					console.error("[DB] Error while updating leaderboard", err);
					throw err;
				}
			}
		} catch (err) {
			console.error("[DB] Cannot get users", err);
		}

		return { userCount, updateCount };
	}

	setActive(apeKey: string, isActive: boolean) {
		this.db.exec(
			"UPDATE users SET isActive = :isActive WHERE apeKey = :apeKey",
			{ isActive, apeKey },
		);
	}

	setDNT(user: User, dnt: boolean) {
		this.db.exec(
			"UPDATE users SET dnt = :dnt WHERE discordId = :discordId",
			{ discordId: user.discordId, dnt },
		);

		user.dnt = dnt ? 1 : 0;
		user.DNT = dnt;
	}

	deleteUser(discordId: string): boolean {
		let success = false;

		try {
			const user: User | undefined = this.getUserByDiscordId(discordId);
			if (!user) throw new Error("User not found in database");

			const monkey = new Monkey(user?.apeKey, discordId);
			monkey.completeProfileFromDB();

			this.deleteTags(user.uid!);
			this.deleteResults(user.uid!);
			this.db.exec("DELETE FROM users WHERE uid = ?", user.uid);
			console.log("[DB] User deleted");
			success = true;
		} catch (err) {
			console.error("[DB] Error while deleting user:", err);
		}

		return success;
	}
	// #endregion Users

	// #region Tags
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

	deleteTags(uid: string) {
		this.db.exec("DELETE FROM tags WHERE uid = ?", uid);
	}
	//#endregion Tags

	// #region Results
	addResults(results: Result[]) {
		if (results.length === 0) return;

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
						error,
					);
					// console.debug(insertStmt);
					break;
				}
			}

			console.log(`[DB] ${results.length - 1} Result(s) added`);
		}
	}

	getLeaderboard(
		options?: { uid?: string; month?: number },
	): LeaderboardMapped[] {
		{
			const { uid } = options ?? {};
			const month = options?.month || new Date().getMonth();

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
    ${uid !== undefined ? "r.uid = :uid AND\n" : ""}
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
	rr.uid,
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
WHERE rr.rn = 1 AND u.dnt = 0
GROUP BY rr.id, u.name, u.discordId, rr.wpm, rr.acc, rr.language, rr.isPb, rr.timestamp
ORDER BY rr.language DESC, rr.wpm DESC;`);

			const start = Math.floor(
				getStartOfMonthTimestamp(month) / 1000,
			);
			const end = Math.floor(
				getStartOfMonthTimestamp(month + 1) / 1000,
			);

			console.debug(
				`[DB] Fetching leaderboard for ${uid ?? "all users"} for the month ${
					getMonthName(month)
				}`,
			);

			// Necessary because SQLite will check if each parameter is in the query and error if not
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

	getBestWPM(options?: { uid?: string; month?: number }): BestWPM[] {
		{
			const { uid } = options ?? {};
			const month = options?.month || new Date().getMonth() - 1;

			using stmt = this.db.prepare(
				`SELECT
	r.language,
	max(r.wpm) as wpm
FROM results r
WHERE
	r.uid = :uid
	AND r.acc >= 95.5
	AND r.mode = 'words'
	AND (
		((r.language IS NULL OR r.language = 'french') AND r.mode2 = '50')
		OR (r.language IN ('french_600k', 'english_450k') AND r.mode2 = '25')
	)
	AND r.lazyMode = 0
	AND (
		r.timestamp >= :start AND r.timestamp < :end
	)
	group by language`,
			);

			const start = Math.floor(
				getStartOfMonthTimestamp(month) / 1000,
			);
			const end = Math.floor(
				getStartOfMonthTimestamp(month + 1) / 1000,
			);

			console.debug(
				`[DB] Fetching best WPM for ${
					uid ? this.getNameFromUID(uid) : "all users"
				} for the month ${getMonthName(month)}`,
			);

			// Necessary because SQLite will check if each parameter is in the query and error if not
			const bind = uid ? { start, end, uid } : { start, end };

			return stmt.all<BestWPM>(bind);
		}
	}

	getLeaderboardWithBestWPM(
		options?: { uid?: string; month?: number },
	): LeaderboardWithBestWPM[] {
		const leaderboard = this.getLeaderboard(options);
		const compareMonth = options?.month || undefined;

		if (!leaderboard || leaderboard.length === 0) return [];

		const uids = [...new Set(leaderboard.map((entry) => entry.uid))];
		const PBs = uids.map((uid) => {
			const lastPB = this.getBestWPM({
				uid,
				month: compareMonth ? compareMonth - 1 : undefined,
			});
			return { uid, lastPB };
		});

		return leaderboard.map((entry) => {
			const lastPB = PBs.find((wpm) => wpm.uid === entry.uid)?.lastPB.find((
				pb,
			) => pb.language === entry.language)?.wpm;

			return { ...entry, lastPB };
		}) as LeaderboardWithBestWPM[];
	}

	deleteResults(uid: string) {
		this.db.exec("DELETE FROM results WHERE uid = ?", uid);
	}
	//#endregion Results
}

export default new DB();
