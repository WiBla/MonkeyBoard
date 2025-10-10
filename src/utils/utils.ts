import { db } from "../index.ts";
import Monkey from "./Monkey.ts";

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

export async function registerUser(
	discordId: string,
	apekey: string,
): Promise<boolean> {
	try {
		const user = new Monkey(apekey, discordId);
		await user.completeProfileFromAPI();

		const results = await user.getResults();
		db.addResults(results);

		console.log("[Utils] User registered successfully");
		return true;
	} catch (err) {
		console.error("[Utils] Error while registering user", err);
		throw err;
	}
}

export function deleteUser(discordId: string): boolean {
	let success = false;

	try {
		const user: User | undefined = db.getUserByDiscordId(discordId);
		if (!user) throw new Error("User not found in database");

		const monkey = new Monkey(user?.apeKey, discordId);
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
			} catch (err) {
				console.error("[Utils] Error while updating leaderboard", err);
				throw err;
			}
		}
	} catch (err) {
		console.error("[Utils] Cannot get users", err);
	}

	return { userCount, updateCount };
}

function formatLastPB(wpm: number, lastPB: number | null): string {
	if (lastPB === null) return "";

	const diff = wpm - lastPB;
	let diffStr = "";

	switch (Math.sign(diff)) {
		case 1:
			diffStr = "🔼";
			break;
		case 0:
			diffStr = "🟰";
			break;
		case -1:
			diffStr = "🔽";
			break;
	}

	return ` ${diffStr} ${Math.abs(Math.round(diff))}`;
}

export function formatLeaderboard(
	leaderboard: LeaderboardMapped[] | LeaderboardWithBestWPM[],
	type: "personal" | "temporary" | "monthly" | "daily",
	month: number = new Date().getMonth(),
): string {
	if (!leaderboard || leaderboard.length === 0) {
		return "Aucun résultat à afficher.";
	}

	let content = "";

	switch (type) {
		case "personal":
			content = `## Vos résultats ${getMonthName(month)} ${
				new Date().getFullYear()
			}\n`;
			break;
		case "temporary":
			content = `## Classement temporaire ${getMonthName(month)} ${
				new Date().getFullYear()
			}\n`;
			break;
		case "daily":
			content = `Classement journalier ${getMonthName(month)}\n\n`;
			break;
		case "monthly":
		default:
			content = `# 🏆 Résultats ${getMonthName(month)} ${
				new Date().getFullYear()
			} 🏆\n`;
			break;
	}

	function formatPosition(
		entry: LeaderboardMapped | LeaderboardWithBestWPM,
		index: number,
	) {
		let { discordId, wpm, /*acc,*/ isPb, tag_names } = entry;
		const lastPB = (entry as LeaderboardWithBestWPM).lastPB ?? null;

		++index;
		const prefix = type === "personal" ? "" : `${index}. <@${discordId}> : `;
		wpm = Math.floor(wpm);
		// acc = Math.floor(acc);
		const pbStr = isPb ? " **PB🔥**" : "";
		tag_names = tag_names ? ` (${tag_names})` : "";
		const lastPBStr = formatLastPB(wpm, lastPB);

		if (type === "daily") {
			content += `${prefix}${wpm} wpm ${pbStr}\n`;
		} else {
			content += `${prefix}${wpm} wpm ${pbStr}${lastPBStr}${tag_names}\n`;
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

	switch (type) {
		case "personal":
		case "temporary":
			content +=
				"\nVous pouvez utiliser la commande \`updatemyscore\` jusqu'à 30 fois par jours pour être sûr d'avoir vos derniers résultats.";
			break;
		case "monthly":
		case "daily":
		default:
			break;
	}

	return content;
}
