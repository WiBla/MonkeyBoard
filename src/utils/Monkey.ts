import { LastResult, Profile, Tags } from "../types/models.d.ts";
import { APIResponse } from "../types/monkeytype.d.ts";
import DB from "./DB.ts";
import { APIError, InactiveApeKeyError, InvalidApeKeyError } from "./errors.ts";
import { Logger } from "./Logger.ts";
import { isProd } from "./utils.ts";

const log = new Logger({ name: "Monkey", level: isProd ? "INFO" : "DEBUG" });

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
		if (apekey !== "") {
			this.checkToken(apekey);
		}

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

	async completeProfileFromAPI(username: string | null): Promise<boolean> {
		try {
			// Check if key is valid and allows us to get their Monkeytype uid
			const lastResult = await this.getLastResult();
			if (!lastResult?.uid) {
				throw new Error("Cannot get last result", lastResult);
			}

			// Username is defaulted to Discord's globalname to avoid 1 API call
			if (username === null) {
				const profile = await this.getProfileByID(lastResult.uid);
				if (!profile?.name) throw new Error("Cannot get profile", profile);
				username = profile.name;
			}

			this.uid = lastResult.uid;
			this.name = username!;

			// Save user to DB
			DB.addUser(this);

			// Get user's tags
			this.updateTags();
		} catch (err) {
			log.error("completeProfileFromAPI() failed", err);
			throw err;
		}

		return true;
	}

	completeProfileFromDB() {
		const user: User | undefined = DB.getUserByToken(this.token);

		if (user === undefined) {
			throw new Error("User not found");
		}

		this.uid = user.uid;
		this.name = user.name;
		this.discordId ??= user.discordId;
		this.DNT = Boolean(user.dnt);
	}

	ensureValidUser(): asserts this is { uid: string } {
		if (typeof this.uid !== "string" || this.token.length === 0) {
			throw new Error(
				"User must be completed from the DB or the API using 'monkey.completeProfileFrom..'",
			);
		}
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
			log.error("isKeyValid() failed", err);
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
					log.error(
						`Error while trying to save ${this.name} as inactive`,
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
			return (data?.data ?? {}) as Profile;
		} catch (err) {
			log.error("Failed to fetch profile:", err);
			return {} as Profile;
		}
	}

	async getProfileByUsername(username: string): Promise<Profile> {
		try {
			const data = await this.get<Profile>(`/users/${username}/profile`);
			return (data?.data ?? {}) as Profile;
		} catch (err) {
			log.error("Failed to fetch profile:", err);
			return {} as Profile;
		}
	}
	// #endregion Profile

	// #region Tags
	async getTags(): Promise<Tags[]> {
		try {
			const data = await this.get<APIResponse<Tags[]>>("/users/tags");
			return (data?.data ?? []) as Tags[];
		} catch (err) {
			log.error("Failed to fetch tags:", err);
			return [] as Tags[];
		}
	}

	async updateTags(): Promise<Tags> {
		try {
			this.ensureValidUser();

			const tags: Tags[] = await this.getTags();

			if (tags.length === 0) {
				log.info(`No tags found for ${this.name}`);
				return 0;
			}

			DB.addTags(tags.map((tag) => ({ ...tag, uid: this.uid })));
			log.success(`Saved ${tags.length} tag(s) for ${this.name}`);

			// Tags also contains scores with best wpm
			DB.addResults(this.TagsToResults(tags));

			return tags;
		} catch (err) {
			log.error(`Error while updating ${this.name} results`, err);
			return 0;
		}
	}

	TagsToResults(tags: Tags[]): Result[] {
		const results: Result[] = [];

		for (const tag of tags) {
			// Time PBs
			for (const key in tag.personalBests.time) {
				const scores = tag.personalBests.time[key];

				for (const result of scores) {
					results.push({
						...result,
						_id: "tagpb-" + Math.random().toString().replace("0.", ""),
						uid: this.uid,
						mode: "time",
						mode2: key,
						tags: [tag._id],
						isPb: true,
					});
				}
			}

			// Words PBs
			for (const key in tag.personalBests.words) {
				const scores = tag.personalBests.words[key];

				for (const result of scores) {
					results.push({
						...result,
						_id: "tagpb-" + Math.random().toString().replace("0.", ""),
						uid: this.uid,
						mode: "words",
						mode2: key,
						tags: [tag._id],
						isPb: true,
					});
				}
			}
		}

		return results;
	}
	// #endregion Tags

	// #region Results
	async updateResults(): Promise<number> {
		try {
			this.ensureValidUser();

			const results = await this.getResults();

			if (results.length > 0) {
				DB.addResults(results.map((result) => ({
					...result,
					uid: this.uid,
				})));

				log.success(
					`Done saving ${results.length} new result(s) for ${this.name}`,
				);
			} else {
				log.info(`No new results for ${this.name}`);
			}

			return results.length;
		} catch (err) {
			log.error(`Error while updating ${this.name} results`, err);
			return 0;
		}
	}

	async getResults(): Promise<Result[]> {
		this.ensureValidUser();

		const timestamp = DB.getMostRecentTimestamp(this.uid);

		const route = `/results${
			timestamp ? `?onOrAfterTimestamp=${timestamp + 1}` : ""
		}`;

		try {
			const data = await this.get<APIResponse<Result[]>>(route);
			return (data?.data ?? []) as Result[];
		} catch (err) {
			log.error("Failed to fetch results:", err);
			throw err;
		}
	}

	async getLastResult(): Promise<LastResult> {
		try {
			const data = await this.get<APIResponse<LastResult>>("/results/last");
			return (data?.data ?? {}) as LastResult;
		} catch (err) {
			log.error("Failed to fetch last result:", err);
			throw err;
		}
	}
	// #endregion Results
}

export default Monkey;
