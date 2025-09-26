import db from "./db.ts";
import { getStartOfMonthTimestamp } from "./utils/utils.ts";

class Monkey {
	// #region Properties
	private API_URL: string;
	private headers: HeadersInit;
	public token: string;
	public uid: string | undefined;
	public name: string | undefined;
	public discordId: number | undefined;
	// #endregion

	constructor(apekey: string, discordId?: number) {
		this.checkToken(apekey);

		this.API_URL = "https://api.monkeytype.com";
		this.headers = { Authorization: `ApeKey ${apekey}` };
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
		const tags: Tags[] = await this.getTags();
		if (tags.length === 0) {
			console.log("[Monkey] No tags found for this user");
			return;
		} else {
			db.addTags(tags.map((tag) => ({ ...tag, uid: profile.uid })));
		}
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

		if (!this.headers) {
			console.error("[Monkey] No API token set. Use setToken() first.");
			return Promise.resolve(false);
		}

		try {
			const res = await fetch(this.API_URL + "/psas", {
				method: "GET",
				headers: this.headers,
			});

			if (res.status === 200) {
				db.setActive(this.token!, true);
				return true;
			}

			if (res.status === 471) {
				console.error("[Monkey] ApeKey is inactive", this.token);
				db.setActive(this.token!, false);
				return false;
			}

			console.error("[Monkey] Unknown HTTP Status code : ", res.status);
			return false;
		} catch (err) {
			console.error("[Monkey] Request error:", err);
			return false;
		}
	}

	async get<T>(path: string): Promise<APIResponse<T>> {
		if (!this.token) {
			console.error("[Monkey] No API token set. Use setToken() first.");
			throw new Error("Unauthorized: API token not set");
		}

		try {
			const res = await fetch(this.API_URL + path, {
				method: "GET",
				headers: this.headers,
			});
			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}
			return await res.json();
		} catch (err) {
			console.error("[Monkey] Request error:", err);
			return { message: "Request error" } as APIResponse<T>;
		}
	}

	//=========
	// Profile
	//=========

	async getProfileByID(uid: string): Promise<Profile> {
		try {
			const data = await this.get<Profile>(
				`/users/${uid}/profile?isUid=true`,
			);
			console.debug("[Monkey] Profile by ID", data);
			return (data?.data ?? {}) as Profile;
		} catch (err) {
			console.error("[Monkey] Failed to fetch profile:", err);
			return {} as Profile;
		}
	}

	async getProfileByUsername(username: string): Promise<Profile> {
		try {
			const data = await this.get<Profile>(`/users/${username}/profile`);
			console.debug("[Monkey] Profile by username", data);
			return (data?.data ?? {}) as Profile;
		} catch (err) {
			console.error("[Monkey] Failed to fetch profile:", err);
			return {} as Profile;
		}
	}

	//======
	// Tags
	//======

	async getTags(): Promise<Tags[]> {
		try {
			const data = await this.get<APIResponse<Tags[]>>("/users/tags");
			console.debug("[Monkey] Tags", data);
			return (data?.data ?? []) as Tags[];
		} catch (err) {
			console.error("[Monkey] Failed to fetch tags:", err);
			return [] as Tags[];
		}
	}

	//=========
	// Results
	//=========

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

			const total = await this.getResults(timestamp);

			console.log(
				`[Utils] Done saving ${total} new result(s) from this user's monthly activity`,
			);
		} catch (err) {
			console.error("[Utils] Error while updating user results", err);
		}
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
			const data = await this.get<APIResponse<Result[]>>(
				`/results?${params.toString()}`,
			);
			return (data?.data ?? []) as Result[];
		} catch (err) {
			console.error("[Monkey] Failed to fetch results:", err);
			return [];
		}
	}

	async getLastResult(): Promise<LastResult> {
		try {
			const data = await this.get<APIResponse<LastResult>>("/results/last");
			console.debug("[Monkey] Last result", data);
			return (data?.data ?? {}) as LastResult;
		} catch (err) {
			console.error("[Monkey] Failed to fetch last result:", err);
			return {} as LastResult;
		}
	}
}

export default Monkey;
