class Monkey {
	constructor() {
		this.API_URL = "https://api.monkeytype.com";
		this.headers = undefined;
		this.uid = null;
	}

	/**
	 * Set the API key for authentication.
	 * Token must be in the expected Base64-like format.
	 * @param {string} token - Raw token string.
	 */
	setToken(token) {
		// const tokenPattern = /^NjhjOT[A-Za-z0-9\-_]+kY2Q1YzQyNmZlM[A-Za-z0-9\-_]+$/;
		const tokenPattern = /^[A-Za-z0-9\-_]{60,}$/;

		if (typeof token !== "string" || !tokenPattern.test(token))
			throw new Error("[Monkey] Invalid token format.");

		this.headers = { Authorization: `ApeKey ${token}` };
		console.log("[Monkey] API key set");
	}

	/**
	 * Delete the stored API key.
	 */
	deleteToken() {
		this.headers = undefined;
		console.log("[Monkey] API key deleted");
	}

	/**
	 * Perform a GET request with proper error handling.
	 * @param {string} path - API path to fetch.
	 */
	async get(path) {
		if (!this.headers) {
			console.error("[Monkey] No API token set. Use setKey() first.");
			throw new Error("Unauthorized: API token not set");
		}

		try {
			const res = await fetch(this.API_URL + path, { headers: this.headers });
			return res.json();
		} catch (err) {
			console.error("[Monkey] Request error:", err.message);
			throw err;
		}
	}

	/**
	 * Fetch user profile by UID
	 * Stores UID internally for later calls.
	 */
	async getProfileByID(uid) {
		try {
			const json = await this.get(`/users/${uid}/profile?isUid=true`);
			const data = json?.data ?? {};
			this.uid = data.uid ?? null;
			return data;
		} catch (err) {
			console.error("[Monkey] Failed to fetch profile:", err.message);
			return {};
		}
	}

	/**
	 * Fetch user profile by username
	 * Stores UID internally for later calls.
	 */
	async getProfileByUsername(username) {
		try {
			const json = await this.get(`/users/${username}/profile`);
			const data = json?.data ?? {};
			this.uid = data.uid ?? null;
			return data;
		} catch (err) {
			console.error("[Monkey] Failed to fetch profile:", err.message);
			return {};
		}
	}

	/**
	 * Fetch user tags. Requires UID to be set.
	 */
	async getTags() {
		if (!this.uid) {
			console.error("[Monkey] UID not set. Fetch profile first.");
			return {};
		}

		try {
			const json = await this.get("/users/tags");
			return json?.data ?? {};
		} catch (err) {
			console.error("[Monkey] Failed to fetch tags:", err.message);
			return {};
		}
	}

	/**
	 * Fetch results after a given timestamp.
	 * @param {number|null} timestamp - Unix timestamp in ms. If null, fetches up to 1000 results.
	 */
	async getResults(timestamp = null) {
		const query = timestamp ? `?onOrAfterTimestamp=${timestamp}` : "";
		try {
			const json = await this.get(`/results${query}`);
			const results = json?.data ?? [];
			if (results.length === 0) {
				console.log("[Monkey] No results returned from API");
			}
			return results;
		} catch (err) {
			console.error("[Monkey] Failed to fetch results:", err.message);
			return [];
		}
	}

	/**
	 * Fetch the last available result.
	 */
	async getLastResult() {
		try {
			const json = await this.get("/results/last");
			const results = json?.data ?? [];
			if (results.length === 0) {
				console.log("[Monkey] No last result found");
			}
			return results;
		} catch (err) {
			console.error("[Monkey] Failed to fetch last result:", err.message);
			return [];
		}
	}
}

export default new Monkey();
