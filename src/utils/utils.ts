import db from "../db.ts";
import Monkey from "../monkey.ts";

export const isProd = Deno.env.get("APP_ID") === "1417277586618323006";

export function isUserDev(discordId: string): boolean {
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
				updateCount += results;
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
	type: "personal" | "temporary" | "monthly" | "daily",
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
			} (vos scores uniquement)\n\n`;
			break;
		case "temporary":
			content = `# Résultats ${getMonthName(month)} ${
				new Date().getFullYear()
			} (temporaires)\n\n`;
			break;
		case "daily":
			content = `Résultats journalier ${getMonthName(month)}\n\n`;
			break;
		case "monthly":
		default:
			content = `# 🏆 Résultats ${getMonthName(month)} ${
				new Date().getFullYear()
			} 🏆\n\n`;
			break;
	}

	function formatPosition(entry: LeaderboardMapped, index: number) {
		let { discordId, wpm, acc, isPb, tag_names }: LeaderboardMapped = entry;

		index++;
		const prefix = type === "personal" ? "" : `${index++}. <@${discordId}> : `;
		wpm = Math.floor(wpm);
		acc = Math.floor(acc);
		const pbStr = isPb ? " **PB🔥**" : "";
		tag_names = tag_names ? ` (${tag_names})` : "";

		if (type === "daily") {
			content += `${prefix}${wpm} wpm ${pbStr}\n`;
		} else {
			content += `${prefix}${wpm} wpm, ${acc}% acc${pbStr}${tag_names}\n`;
		}
	}

	const languages: { title: string; filter: string | null }[] = [
		{ title: "FR Stock", filter: "french" },
		{ title: "FR 600k", filter: "french_600k" },
		{ title: "EN Stock", filter: null },
		{ title: "EN 450k", filter: "english_450k" },
	];

	for (const language of languages) {
		content += `${(type === "daily" ? "" : "## ")}${language.title} :\n`;
		leaderboard.filter((entry) => entry.language === language.filter).forEach(
			formatPosition,
		);
	}

	return content;
}
