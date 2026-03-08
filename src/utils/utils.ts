import { DEV_ID, PROD_BOT_ID } from "./const.ts";

export const isProd = Deno.env.get("APP_ID") === PROD_BOT_ID;

export function isUserDev(discordId: string): boolean {
	return discordId === DEV_ID;
}

export enum MonthOffset {
	Now = 0,
	Previous = -1,
	Compare = -2,
}

export function isOffsetOOB(value: number): asserts value is MonthOffset {
	if (!Object.values(MonthOffset).includes(value)) {
		throw new Error(`Invalid MonthOffset: ${value}`);
	}
}

export function getMonthBounds(
	offset: MonthOffset = MonthOffset.Now,
): { startMs: number; endMs: number } {
	isOffsetOOB(offset);

	const now = new Date();

	// Move to the target month (Date handles year rollover automatically)
	const targetMonth = new Date(
		now.getFullYear(),
		now.getMonth() + offset,
		1,
	);

	// First millisecond of the month
	const start = new Date(
		targetMonth.getFullYear(),
		targetMonth.getMonth(),
		1,
		0,
		0,
		0,
		0,
	);

	// Last millisecond of the month:
	// first millisecond of next month minus 1
	const end = new Date(
		targetMonth.getFullYear(),
		targetMonth.getMonth() + 1,
		1,
		0,
		0,
		0,
		0,
	);
	end.setMilliseconds(end.getMilliseconds() - 1);

	return {
		startMs: Math.floor(start.getTime() / 1000),
		endMs: Math.floor(end.getTime() / 1000),
	};
}

export function getMonthName(offset: MonthOffset): string {
	isOffsetOOB(offset);

	const { startMs } = getMonthBounds(offset);

	const monthName = new Date(startMs * 1000).toLocaleString("fr", {
		month: "long",
	});
	return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

export function timestampToReadableDate(ts: number | undefined): string {
	if (ts === undefined) return "inconnue";
	return new Date(ts.toString().length > 10 ? ts : ts * 1000)
		.toLocaleDateString("FR-fr");
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
	monthName: string;
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
	const { type, monthName } = opts;
	let { visibility } = opts;
	visibility = {
		...opts.visibility,
		showTags: opts?.visibility?.showTags ?? true,
		showDiff: opts?.visibility?.showDiff ?? true,
		showPB: opts?.visibility?.showPB ?? true,
	};

	// Header
	switch (type) {
		case "personal":
			content = `## Vos résultats ${monthName} ${new Date().getFullYear()}\n`;
			break;
		case "temporary":
			content = `## Classement temporaire ${monthName} ${
				new Date().getFullYear()
			}\n`;
			break;
		case "monthly":
		default:
			content = `# 🏆 Résultats ${monthName} ${new Date().getFullYear()} 🏆\n`;
			break;
	}

	function formatPosition(
		entry: LeaderboardMapped | LeaderboardWithBestWPM,
		index: number,
	) {
		let { /*id,*/ discordId, wpm, /*acc,*/ isPb, tag_names } = entry;
		const lastPB = (entry as LeaderboardWithBestWPM).lastPB ?? null;

		++index;
		let indexStr = "";
		switch (index) {
			case 1:
				indexStr = "🥇";
				break;
			case 2:
				indexStr = "🥈";
				break;
			case 3:
				indexStr = "🥉";
				break;
			default:
				indexStr = index.toString();
				break;
		}

		const prefix = type === "personal" ? "" : `${indexStr}. <@${discordId}> : `;
		wpm = Math.floor(wpm);
		// acc = Math.floor(acc);
		const pbStr = isPb ? " **PB 🔥**" : "";
		tag_names = tag_names ? ` (${tag_names})` : "";
		const lastPBStr = formatLastPB(wpm, lastPB);

		// const isManual = type !== "monthly" && id.includes("manual")
		// 	? " (⚠️ score manuel)"
		// 	: "";

		content += `${prefix}${wpm} wpm ${visibility!.showPB ? pbStr : ""}${
			visibility!.showDiff ? lastPBStr : ""
		}${visibility!.showTags ? tag_names : ""}\n`;
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
