import * as path from "@std/path";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { API } from "./app.ts";
import db from "./db.ts";
import { getStartOfMonthTimestamp } from "./utils.ts";

class Monkey {
	private API_URL: string;
	private reqConfig: AxiosRequestConfig;
	public token: string;
	public uid: string | undefined;
	public name: string | undefined;
	public discordId: number | undefined;

	constructor(apekey: string, discordId?: number) {
		this.checkToken(apekey);

		this.API_URL = "https://api.monkeytype.com";
		this.reqConfig = { headers: { Authorization: `ApeKey ${apekey}` } };
		this.token = apekey;
		this.discordId = discordId;
	}

	checkToken(token: string) {
		const tokenPattern = /^[A-Za-z0-9\-_]{76}$/;

		if (typeof token !== "string" || !tokenPattern.test(token)) {
			throw new Error("[Monkey] Invalid token format.");
		}
	}

	async completeProfileFromAPI() {
		// Check if key is valid and allows us to get their Monkeytype uid
		const lastResult = await this.getLastResult();
		if (!lastResult?.uid) throw new Error("Cannot get last result");

		// Get user's username
		const profile = await this.getProfileByID(lastResult.uid);
		if (!profile?.name) throw new Error("Cannot get profile");

		this.uid = profile.uid;
		this.name = profile.name;

		// Save user to DB
		db.addUser(this);

		// Get user's tags
		db.addTags(await this.getTags(), profile.uid);
	}

	completeProfileFromDB() {
		const user = db.getUserByToken(this.token);

		if (user === undefined) {
			throw new Error("[Monkey] User not found");
		}

		this.uid = user.uid;
		this.name = user.name;
		this.discordId ??= user.discordId;
	}

	async isKeyValid(token?: string): Promise<boolean> {
		if (token) this.token = token;

		if (!this.reqConfig) {
			console.error("[Monkey] No API token set. Use setToken() first.");
			return Promise.resolve(false);
		}

		try {
			const res = await API.get(this.API_URL + "/psas", this.reqConfig);

			if (res.status === 200) {
				db.setActive(this.token!, true);
				return Promise.resolve(true);
			}

			if (res.status === 471) {
				console.error("[Monkey] ApeKey is inactive", this.token);
				db.setActive(this.token!, false);
				return Promise.resolve(false);
			}

			console.error("[Monkey] Unknown HTTP Status code : ", res.status);
			return Promise.resolve(false);
		} catch (err) {
			console.error("[Monkey] Request error:", err);
			return Promise.resolve(false);
		}
	}

	async get(path: string): Promise<AxiosResponse> {
		if (!this.token) {
			console.error("[Monkey] No API token set. Use setToken() first.");
			throw new Error("Unauthorized: API token not set");
		}

		try {
			const res = await API.get(this.API_URL + path, this.reqConfig);
			return res.data;
		} catch (err) {
			console.error("[Monkey] Request error:", err);
			throw err;
		}
	}

	//=========
	// Profile
	//=========

	async getProfileByID(uid: string) {
		try {
			const data = await this.get(`/users/${uid}/profile?isUid=true`);
			console.debug("[Monkey] Profile by ID", { data });
			return data?.data ?? {};
		} catch (err) {
			console.error("[Monkey] Failed to fetch profile:", err);
			return {};
		}
	}

	async getProfileByUsername(username: string) {
		try {
			const data = await this.get(`/users/${username}/profile`);
			console.debug("[Monkey] Profile by username", { data });
			return data?.data ?? {};
		} catch (err) {
			console.error("[Monkey] Failed to fetch profile:", err);
			return {};
		}
	}

	//======
	// Tags
	//======

	async getTags() {
		try {
			const data = await this.get("/users/tags");
			console.debug("[Monkey] Tags", { data });
			return data?.data ?? {};
		} catch (err) {
			console.error("[Monkey] Failed to fetch tags:", err);
			return {};
		}
	}

	//=========
	// Results
	//=========

	async initResults() {
		try {
			const total = await this.getAllResultsAfter();

			console.log(
				`[Utils] Done saving ${total} new result(s) from this user's activity`,
			);
		} catch (err) {
			console.error("[Utils] Error while initiating user results", err);
		}
	}

	async updateResults() {
		if (!this.uid) {
			throw new Error(
				"[Monkey] User must be completed from the DB or the API using 'monkey.completeProfileFrom..'",
			);
		}

		try {
			// Attempts to get the latest result that is already in DB
			let timestamp = db.getMostRecentTimestamp(this.uid);
			// Otherwise start from the 1st of the month
			timestamp ??= getStartOfMonthTimestamp();

			const total = await this.getAllResultsAfter(timestamp);

			console.log(
				`[Utils] Done saving ${total} new result(s) from this user's monthly activity`,
			);
		} catch (err) {
			console.error("[Utils] Error while updating user results", err);
		}
	}

	async getAllResultsAfter(
		timestamp: number | null = null,
		offset = 0,
		total = 0,
	): Promise<number> {
		const results = await this.getResults(timestamp, offset);

		if (results !== undefined && results.length > 0) {
			total += results.length;
			console.log(`[Utils] Found ${results.length} scores, total ${total}`);

			db.addResults(results);
			console.log(`[Utils] Done saving current score data`);
		}

		return total;
	}

	async getResults(
		timestamp: number | null = null,
		offset = 0,
	): Promise<Result[]> {
		const params = new URLSearchParams();
		if (timestamp) params.append("onOrAfterTimestamp", timestamp + "");
		if (offset) params.append("offset", offset + "");

		console.debug("[Monkey] Fetching results", { timestamp, offset });

		try {
			const data = await this.get(`/results?${params.toString()}`);
			Deno.writeTextFile(
				path.join(
					Deno.cwd(),
					`./src/fakeData/backups/${this.name}_results_${timestamp}_${offset}.txt`,
				),
				JSON.stringify(data),
			);
			return data?.data ?? [];
		} catch (err) {
			console.error("[Monkey] Failed to fetch results:", err);
			return [];
		}
	}

	async getLastResult() {
		try {
			const data = await this.get("/results/last");
			console.debug("[Monkey] Last result", { data });
			return data?.data ?? [];
		} catch (err) {
			console.error("[Monkey] Failed to fetch last result:", err);
			return [];
		}
	}
}

export default Monkey;
