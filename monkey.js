class Monkey {
	constructor() {
		this.API_URL = "https://api.monkeytype.com";
		this.headers = undefined;
		this.uid = null;
	}

	/**
	 * Set the API key for authentication.
	 * @param {string} token - Monkeytype API token.
	 */
	setKey(token) {
		this.headers = { Authorization: `ApeKey ${token}` };
		console.log("[monkey.js] API key set");
	}

	/**
	 * Delete the stored API key.
	 */
	deleteKey() {
		this.headers = undefined;
		console.log("[monkey.js] API key deleted");
	}

	/**
	 * Perform a GET request with proper error handling.
	 * @param {string} path - API path to fetch.
	 */
	async get(path) {
		try {
			const res = await fetch(this.API_URL + path, { headers: this.headers });
			return res.json();
		} catch (err) {
			console.error("[monkey.js] Request error:", err.message);
			throw err;
		}
	}

	/**
	 * Fetch user profile by UID or username.
	 * Stores UID internally for later calls.
	 */
	async getProfile(uidOrName) {
		try {
			const json = await this.get(`/users/${uidOrName}/profile?isUid=true`);
			const data = json?.data ?? {};
			this.uid = data.uid ?? null;
			return data;
		} catch (err) {
			console.error("[monkey.js] Failed to fetch profile:", err.message);
			return {};
		}
	}

	/**
	 * Fetch user tags. Requires UID to be set.
	 */
	async getTags() {
		if (!this.uid) {
			console.error("[monkey.js] UID not set. Fetch profile first.");
			return {};
		}

		try {
			const json = await this.get("/users/tags");
			return json?.data ?? {};
		} catch (err) {
			console.error("[monkey.js] Failed to fetch tags:", err.message);
			return {};
		}
	}

	/**
	 * Fetch results after a fixed timestamp.
	 * Adjust timestamp as needed.
	 */
	async getResults() {
		try {
			const json = await this.get("/results?onOrAfterTimestamp=1736290800000");
			const results = json?.data ?? [];
			if (results.length === 0) {
				console.log("[monkey.js] No results returned from API");
			}
			return results;
		} catch (err) {
			console.error("[monkey.js] Failed to fetch results:", err.message);
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
				console.log("[monkey.js] No last result found");
			}
			return results;
		} catch (err) {
			console.error("[monkey.js] Failed to fetch last result:", err.message);
			return [];
		}
	}
}

export default new Monkey();
