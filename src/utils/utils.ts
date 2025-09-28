import {
	InteractionResponseFlags,
	InteractionResponseType,
} from "discord-interactions";
import db from "../db.ts";
import Monkey from "../monkey.ts";
import { Component, InteractionResponse } from "../types/discord.d.ts";

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
	flags: number;
	components: Component[];
}): InteractionResponse {
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

export function formatLeaderboard(
	leaderboard: LeaderboardMapped[],
	type: "personal" | "temporary" | "monthly",
): string {
	let content = "";

	switch (type) {
		case "personal":
			content = `# Pronostique de vos résultats actuel\n\n`;
			break;
		case "temporary":
			content = `# Pronostique des résultats du mois en cours\n\n`;
			break;
		case "monthly":
		default:
			content = `# 🏆 Résultats du mois 🏆\n\n`;
			break;
	}

	function formatPosition(entry, index: number) {
		let { discordId, wpm, acc, isPb, tag_names } = entry;

		index++;
		const prefix = type === "personal" ? "" : `${index++}. <@${discordId}> : `;
		wpm = Math.floor(wpm);
		acc = Math.floor(acc);
		isPb = isPb ? "**PB 🔥**" : "";
		tag_names = tag_names ? `(${tag_names})` : "";

		content += `${prefix}${wpm} wpm, ${acc}% acc ${isPb} ${tag_names}\n`;
	}

	content += `## FR Stock :\n`;
	leaderboard.filter((entry) => entry.language === "french").forEach(
		formatPosition,
	);

	content += `## FR 600k :\n`;
	leaderboard.filter((entry) => entry.language === "french_600k").forEach(
		formatPosition,
	);

	content += `## EN Stock :\n`;
	leaderboard.filter((entry) => entry.language === null).forEach(
		formatPosition,
	);

	content += `## FR 450k :\n`;
	leaderboard.filter((entry) => entry.language === "english_450k").forEach(
		formatPosition,
	);

	return content;
}
