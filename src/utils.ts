import {
	InteractionResponseFlags,
	InteractionResponseType,
} from "discord-interactions";
import db from "./db.ts";
import Monkey from "./monkey.ts";

export function getStartOfMonthTimestamp(month?: number): number {
	const now = new Date();
	return new Date(now.getFullYear(), month || now.getMonth(), 1).getTime();
}

export function buildResponse({
	type = InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
	flags = 0,
	components,
}: {
	type?: number;
	flags?: number;
	components: {
		type: number;
		items?: { media: { url: string } }[];
		content?: string;
	}[];
}) {
	// Add component V2 by default
	flags |= InteractionResponseFlags.IS_COMPONENTS_V2;

	return { type, data: { flags, components } };
}

export async function registerUser(discordId: string, apekey: string) {
	let success = false;

	try {
		const user = new Monkey(apekey, Number(discordId));
		await user.completeProfileFromAPI();

		// Do not await this so it doesn't block the thread
		user.getResults()
			.then((results) => db.addResults(results))
			.catch((err) =>
				console.error("[Utils] Error while fetching results for new user", err)
			);

		success = true;
		console.log("[Utils] User registered successfully");
	} catch (err) {
		console.error("[Utils] Error while registering user:", err);
	}

	return success;
}

export function updateLeaderboard() {
	try {
		const users = db.getAllUsers();
		const promises = [];

		for (const dbUser of users) {
			promises.push(
				async () => {
					try {
						const user = new Monkey(dbUser.apekey);
						const isKeyValid = await user.isKeyValid();

						if (!isKeyValid) {
							throw new Error("Invalid ApeKey for user" + dbUser.apeKey);
						}

						user.completeProfileFromDB();
						user.updateResults();
					} catch (error) {
						console.error("[Utils] Error while updating leaderboard", error);
					}
				},
			);
		}

		Promise.allSettled(promises);
	} catch (err) {
		console.error("[Utils] Cannot get users", err);
	}
}
