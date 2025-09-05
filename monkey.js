import dotenv from "dotenv";

dotenv.config({ quiet: true });

const { BEARER_TOKEN } = process.env;

if (!BEARER_TOKEN) {
	console.error("Missing API_URL or BEARER_TOKEN in .env");
	process.exit(1);
}

class Monkey {
	constructor(TOKEN) {
		this.API_URL = "https://api.monkeytype.com";
		this.ApeKey = `ApeKey ${TOKEN}`;
		this.headers = { Authorization: this.ApeKey };
		this.uid = null;
	}

	async get(path) {
		const response = await fetch(this.API_URL + path, this.headers);

		if (!response.ok) {
			console.error(
				`Error fetching ${this.API_URL + path} with headers: \n${
					this.headers
				}\n${response.status}`,
				await response.text()
			);
			process.exit(1);
		}

		return await response.json();
	}

	async getProfile(uidOrName) {
		const json = await this.get(`/users/${uidOrName}/profile`);
		const data = json.data ?? {};

		this.uid = data.uid;

		return data;
	}

	async getTags() {
		if (!this.uid) {
			console.error(
				"You should probably fetch the user's profile first in order to get their uid"
			);
			return {};
		}

		const json = await this.get("/users/tags");
		const data = json.data ?? {};
		return json;
	}

	async getResults() {
		const response = await fetch(
			this.API_URL + "/results?onOrAfterTimestamp=1736290800000",
			this.headers
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

		return results;
	}
}

export default new Monkey(BEARER_TOKEN);
