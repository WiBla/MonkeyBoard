import { LastResult, Profile, Tags } from "../types/models.d.ts";
import { APIResponse } from "../types/monkeytype.d.ts";
import DB from "./DB.ts";
import { APIError, InactiveApeKeyError, InvalidApeKeyError } from "./errors.ts";
import { getStartOfMonthTimestamp } from "./utils.ts";

class Monkey {
	// #region Properties
	private API_URL: string;
	private headers: HeadersInit;
	public token: string;
	public uid: string | undefined;
	public name: string | undefined;
	public discordId: string | undefined;
	public DNT: boolean;
	// #endregion

	// #region Base operations
	constructor(apekey: string, discordId?: string) {
		this.checkToken(apekey);

		this.API_URL = "https://api.monkeytype.com";
		this.headers = { Authorization: `ApeKey ${apekey}` };
		this.token = apekey;
		this.discordId = discordId;
		this.DNT = false;
	}

	checkToken(token: string) {
		const tokenPattern = /^[A-Za-z0-9\-_]{76}$/;

		if (typeof token !== "string" || !tokenPattern.test(token)) {
			throw new InvalidApeKeyError();
		}
	}

	async completeProfileFromAPI(): Promise<boolean> {
		try {
			// Check if key is valid and allows us to get their Monkeytype uid
			const lastResult = await this.getLastResult();
			if (!lastResult?.uid) {
				throw new Error("Cannot get last result", lastResult);
			}

			// Get user's username
			const profile = await this.getProfileByID(lastResult.uid);
			if (!profile?.name) throw new Error("Cannot get profile", profile);

			this.uid = profile.uid;
			this.name = profile.name;

			// Save user to DB
			DB.addUser(this);

			// Get user's tags
			const tags: Tags[] = await this.getTags();
			if (tags.length === 0) {
				console.log("[Monkey] No tags found for this user");
			} else {
				DB.addTags(tags.map((tag) => ({ ...tag, uid: profile.uid })));
			}
		} catch (err) {
			console.error("[Monkey] completeProfileFromAPI() failed", err);
			throw err;
		}

		return true;
	}

	completeProfileFromDB() {
		const user: User | undefined = DB.getUserByToken(this.token);

		if (user === undefined) {
			throw new Error("[Monkey] User not found");
		}

		this.uid = user.uid;
		this.name = user.name;
		this.discordId ??= user.discordId;
		this.DNT = Boolean(user.dnt);
	}

	async isKeyValid(token?: string): Promise<boolean> {
		if (token) this.token = token;

		if (!this.headers) {
			throw new APIError("Unauthorized: API token not set");
		}

		try {
			const res = await fetch(this.API_URL + "/psas", {
				method: "GET",
				headers: this.headers,
			});

			if (res.status === 200) {
				DB.setActive(this.token!, true);
				return true;
			}

			if (res.status === 471) {
				DB.setActive(this.token!, false);
				throw new InactiveApeKeyError();
			}

			throw new APIError(`Unexpected HTTP status: ${res.status}`);
		} catch (err) {
			console.error("[Monkey] isKeyValid() failed", err);
			throw err;
		}
	}

	async get<T>(path: string): Promise<APIResponse<T>> {
		if (!this.token) {
			throw new APIError("Unauthorized: API token not set");
		}

		try {
			const res = await fetch(this.API_URL + path, {
				method: "GET",
				headers: this.headers,
			});

			if (res.status === 200) {
				return await res.json();
			}

			if (res.status === 471) {
				try {
					DB.setActive(this.token, false);
				} catch (err) {
					console.error(
						"[Monkey] Error while trying to save user as inactive",
						err,
					);
				}
				throw new InactiveApeKeyError();
			}

			throw new APIError(`Unexpected HTTP status: ${res.status}`);
		} catch (err) {
			if (err instanceof InactiveApeKeyError) throw err;
			throw new APIError("Network or parsing error", err);
		}
	}
	// #endregion Base operations

	// #region Profile
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
	// #endregion Profile

	// #region Tags
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
	// #endregion Tags

	// #region Results
	async updateResults(): Promise<number> {
		if (!this.uid) {
			throw new Error(
				"[Monkey] User must be completed from the DB or the API using 'monkey.completeProfileFrom..'",
			);
		}

		try {
			// Attempts to get the latest result that is already in DB
			let timestamp = DB.getMostRecentTimestamp(this.uid);
			// Otherwise start from the 1st of the month
			timestamp ??= getStartOfMonthTimestamp();

			const results = await this.getResults(timestamp);
			const trueResults = results.length - 1; // API always returns the result from the timestamp

			DB.addResults(results.map((result) => ({
				...result,
				uid: this.uid!,
			})));

			console.log(
				`[Monkey] Done saving ${trueResults} new result(s) from this user's monthly activity`,
			);

			return trueResults;
		} catch (err) {
			console.error("[Monkey] Error while updating user results", err);
			return 0;
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
			throw err;
		}
	}

	async getLastResult(): Promise<LastResult> {
		try {
			const data = await this.get<APIResponse<LastResult>>("/results/last");
			console.debug("[Monkey] Last result", data);
			return (data?.data ?? {}) as LastResult;
		} catch (err) {
			console.error("[Monkey] Failed to fetch last result:", err);
			throw err;
		}
	}
	// #endregion Results
}

export default Monkey;
