import * as path from "@std/path";
import { CronJob } from "cron";
import { Client, Collection, GatewayIntentBits, TextChannel } from "discord.js";
import db from "./db.ts";
import { TSClient } from "./types/client.ts";
import { formatLeaderboard, isProd, updateAll } from "./utils/utils.ts";

// #region Basic setup
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const PUBLIC_KEY = Deno.env.get("PUBLIC_KEY");

if (!DISCORD_TOKEN || !PUBLIC_KEY) {
	console.error(".env file not properly configured");
	Deno.exit(1);
}
// #endregion Basic setup

// #region Create Discord client
console.log("[BOT] Starting up client...");

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as TSClient;

// #region Auto attach commands
const commandsFolders = path.join(Deno.cwd(), "src/commands");
client.commands = new Collection();
client.cooldowns = new Collection();

for await (const folder of Deno.readDir(commandsFolders)) {
	if (!folder.isDirectory) continue;

	for await (
		const file of Deno.readDir(path.join(commandsFolders, folder.name))
	) {
		if (!file.isFile || !file.name.endsWith(".ts")) continue;

		const filePath = path.join(commandsFolders, folder.name, file.name);
		const commandModule = await import(`file://${filePath}`);
		const command = commandModule.default ?? commandModule;

		if ("data" in command && "execute" in command) {
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			client.commands.set(command.data.name, command);
		} else {
			console.warn(
				`[BOT] The command at ${filePath} is missing a required "data" or "execute" property.`,
			);
		}
	}
}
// #endregion Auto attach commands

// #region Auto Event handling
const eventFiles = path.join(Deno.cwd(), "src/events");

for await (const file of Deno.readDir(eventFiles)) {
	if (!file.isFile || !file.name.endsWith(".ts")) continue;

	const filePath = path.join(eventFiles, file.name);
	const eventModule = await import(`file://${filePath}`);
	const event = eventModule.default ?? eventModule;

	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}
// #endregion Auto Event handling

client.login(DISCORD_TOKEN);
// #endregion Create Discord client

// #region Cron jobs
// Get leaderboard every 1st of the month at 9am
new CronJob(
	"0 9 1 * *",
	async () => {
		console.log("[CRON] Fetching latest leaderboard data...");

		try {
			const { userCount, updateCount } = await updateAll();
			console.log(
				`[UpdateAll] Updated ${updateCount} results for ${userCount} users`,
			);

			const leaderboardId = isProd
				? "1101583276667310180"
				: "1417555936733696050";
			const leaderboard = await client.channels.fetch(leaderboardId);
			const month = new Date().getMonth() - 1;

			if (leaderboard && leaderboard.isTextBased() && "send" in leaderboard) {
				const leaderboardResult: LeaderboardMapped[] = db.getLeaderboard({
					month,
				});

				await (leaderboard as TextChannel).send(formatLeaderboard(
					leaderboardResult,
					"monthly",
					month,
				));
			}
		} catch (error) {
			console.error("[BOT] Error creating monthly leaderboard", error);
		}
	},
	null,
	true,
);

// Post a leaderboard update every day at 9am
new CronJob(
	"0 9 * * *",
	async () => {
		console.log("[CRON] Updating everyone's score");

		try {
			const { userCount, updateCount } = await updateAll();
			console.log(
				`[UpdateAll] Updated ${updateCount} results for ${userCount} users`,
			);

			const cooldownChannel = isProd
				? "1101591223040491682"
				: "1425221573186682891";
			const leaderboard = await client.channels.fetch(cooldownChannel);
			const month = new Date().getMonth();

			if (leaderboard && leaderboard.isTextBased() && "send" in leaderboard) {
				const leaderboardResult: LeaderboardMapped[] = db.getLeaderboard({
					month,
				});

				await (leaderboard as TextChannel).send({
					content: formatLeaderboard(
						leaderboardResult,
						"daily",
						month,
					) +
						"\nVous voulez participer ? N'hésitez pas à lier votre compte avec la commande \`/register\` !",
					// Do NOT mention anyone
					allowedMentions: {
						parse: [],
					},
				});
			}
		} catch (error) {
			console.error("[BOT] Error creating daily leaderboard", error);
		}
	},
	null,
	true,
);
// #endregion Cron jobs
