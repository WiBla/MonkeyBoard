import {
	InteractionResponseFlags,
	InteractionResponseType,
} from "discord-interactions";
import db from "../db.ts";
import Monkey from "../monkey.ts";
import { Component, InteractionResponse } from "../types/discord.d.ts";

export function isDev(discordId: string): boolean {
	return discordId === "106511773581991936";
}

export function getStartOfMonthTimestamp(month?: number): number {
	if (month !== undefined && (month < 0 || month > 11)) {
		throw new Error("Month must be between 0 and 11");
	}

	const now = new Date();
	return new Date(now.getFullYear(), month || now.getMonth(), 1).getTime();
}

export function getMonthName(month: number): string {
	const monthName = new Date(0, month).toLocaleString("fr", { month: "long" });
	return monthName.charAt(0).toUpperCase() + monthName.slice(1);
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

export function deleteUser(discordId: string) {
	let success = false;

	try {
		const user = db.getUserByDiscordId(discordId);
		if (!user) throw new Error("User not found in database");

		const monkey = new Monkey(user?.apeKey, Number(discordId));
		monkey.completeProfileFromDB();

		db.deleteUser(monkey);
		success = true;
	} catch (err) {
		console.error("[Utils] Error while deleting user:", err);
	}

	return success;
}

export async function updateAll(): Promise<
	{ userCount: number; updateCount: number }
> {
	let userCount = 0;
	let updateCount = 0;

	try {
		const users = db.getAllUsers();

		for (const dbUser of users) {
			try {
				userCount++;
				const user = new Monkey(dbUser.apeKey);
				const isKeyValid = await user.isKeyValid();

				if (!isKeyValid) {
					throw new Error("Invalid ApeKey for user" + dbUser.apeKey);
				}

				user.completeProfileFromDB();
				const results = await user.updateResults();
				if (results > 1) updateCount += results;
			} catch (error) {
				console.error("[Utils] Error while updating leaderboard", error);
			}
		}
	} catch (err) {
		console.error("[Utils] Cannot get users", err);
	}

	return { userCount, updateCount };
}

export function formatLeaderboard(
	leaderboard: LeaderboardMapped[],
	type: "personal" | "temporary" | "monthly",
	month: number = new Date().getMonth(),
): string {
	if (!leaderboard || leaderboard.length === 0) {
		return "Aucun résultat à afficher.";
	}

	let content = "";

	switch (type) {
		case "personal":
			content = `# Résultats ${getMonthName(month)} ${
				new Date().getFullYear()
			} (vos scores uniquement) 🏆\n\n`;
			break;
		case "temporary":
			content = `# Résultats ${getMonthName(month)} ${
				new Date().getFullYear()
			} (temporaires) 🏆\n\n`;
			break;
		case "monthly":
		default:
			content = `# 🏆 Résultats ${getMonthName(month)} ${
				new Date().getFullYear()
			} 🏆\n\n`;
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
