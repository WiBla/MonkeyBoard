export const isProd = Deno.env.get("APP_ID") === "1417277586618323006";

export function isUserDev(discordId: string): boolean {
	return discordId === "106511773581991936";
}

export function getStartOfMonthTimestamp(month?: number): number {
	const now = new Date();
	const year = now.getFullYear();

	const target = month !== undefined
		? new Date(year, month, 1)
		: new Date(year, now.getMonth(), 1);

	return target.getTime();
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
	{ title: "🇫🇷", filter: "french" },
	{ title: "🇫🇷 600k", filter: "french_600k" },
	{ title: "🇬🇧", filter: null },
	{ title: "🇬🇧 450k", filter: "english_450k" },
];

interface formatLeaderboardOptions {
	type: "personal" | "temporary" | "monthly";
	month?: number;
	visibility?: { showTags: boolean; showDiff: boolean; showPB: boolean };
}

export function formatLeaderboard(
	leaderboard: LeaderboardMapped[] | LeaderboardWithBestWPM[],
	opts: formatLeaderboardOptions,
): string {
	if (!leaderboard || leaderboard.length === 0) {
		return "Aucun résultat à afficher.";
	}

	let content = "";
	const { type } = opts;
	let { month, visibility } = opts;
	month ??= new Date().getMonth();
	visibility = {
		...opts.visibility,
		showTags: opts?.visibility?.showTags ?? true,
		showDiff: opts?.visibility?.showDiff ?? true,
		showPB: opts?.visibility?.showPB ?? true,
	};

	// Header
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

		content += `${prefix}${wpm} wpm ${visibility!.showPB ? pbStr : ""}${
			visibility!.showDiff ? lastPBStr : ""
		}${visibility!.showTags ? tag_names : ""}${isManual}\n`;
	}

	for (const language of languages) {
		content += `## ${language.title} :\n`;
		leaderboard.filter((entry) => entry.language === language.filter).forEach(
			formatPosition,
		);
	}

	if (type === "personal") {
		content +=
			"\nVous pouvez utiliser la commande \`actualiser\` jusqu'à 30 fois par jours pour être sûr d'avoir vos derniers résultats.";
	}

	return content;
}
