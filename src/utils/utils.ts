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

function formatLastPB(wpm: number, lastPB: number | null): string {
	if (lastPB === null) return "";

	const diff = Math.round(wpm - lastPB);
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

	return ` ${diffStr} ${Math.abs(diff)}`;
}

const languages: { title: string; filter: string | null }[] = [
	{ title: "FR Stock", filter: "french" },
	{ title: "FR 600k", filter: "french_600k" },
	{ title: "EN Stock", filter: null },
	{ title: "EN 450k", filter: "english_450k" },
];

export function formatLeaderboard(
	leaderboard: LeaderboardMapped[] | LeaderboardWithBestWPM[],
	type: "personal" | "temporary" | "monthly",
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
		let { id, discordId, wpm, /*acc,*/ isPb, tag_names } = entry;
		const lastPB = (entry as LeaderboardWithBestWPM).lastPB ?? null;

		++index;
		const prefix = type === "personal" ? "" : `${index}. <@${discordId}> : `;
		wpm = Math.floor(wpm);
		// acc = Math.floor(acc);
		const pbStr = isPb ? " **PB 🔥**" : "";
		tag_names = tag_names ? ` (${tag_names})` : "";
		const lastPBStr = formatLastPB(wpm, lastPB);

		const isManual = id.includes("manual") ? " (⚠️ score manuel)" : "";

		// TODO this could be replaced by a "simplified" bool option in the /podium cmd
		if (type === "temporary") {
			content += `${prefix}${wpm} wpm ${pbStr}${isManual}\n`;
		} else {
			content += `${prefix}${wpm} wpm ${pbStr}${lastPBStr}${tag_names}\n`;
		}
	}

	for (const language of languages) {
		content += `${(type === "temporary" ? "" : "## ")}${language.title} :\n`;
		leaderboard.filter((entry) => entry.language === language.filter).forEach(
			formatPosition,
		);
	}

	switch (type) {
		case "personal":
		case "temporary":
			content +=
				"\nVous pouvez utiliser la commande \`actualiser\` jusqu'à 30 fois par jours pour être sûr d'avoir vos derniers résultats.";
			break;
		case "monthly":
		default:
			break;
	}

	return content;
}
