import { CronJob } from "cron";
import { Client, Collection, GatewayIntentBits, TextChannel } from "discord.js";
import commands from "./commands/index.ts";
import events from "./events/index.ts";
import { TSClient } from "./types/client.ts";
import DB from "./utils/DB.ts";
import { Logger } from "./utils/Logger.ts";
import { formatLeaderboard, isProd } from "./utils/utils.ts";

export const log = new Logger({
	name: "BOT",
	level: isProd ? "INFO" : "DEBUG",
});

// #region Basic setup
const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const PUBLIC_KEY = Deno.env.get("PUBLIC_KEY");
const APP_ID = Deno.env.get("APP_ID");

if (!DISCORD_TOKEN || !PUBLIC_KEY || !APP_ID) {
	log.error(".env file not properly configured");
	Deno.exit(1);
}
// #endregion Basic setup

// #region Create Discord client
log.info("Starting up client...");

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as TSClient;

// #region Load commands
client.commands = new Collection();
client.cooldowns = new Collection();

for (const command of commands) {
	client.commands.set(command.data.name, command);
}
// #endregion Load commands

// #region Auto Event handling
for (const event of events) {
	if (event.once) {
		client.once(event.name, (e) => event.execute(e));
	} else {
		client.on(event.name, (e) => event.execute(e));
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
		log.info("[CRON] Fetching latest leaderboard data...");

		try {
			const { userCount, updateCount } = await DB.updateAll();
			log.success(
				`[ToutMAJ] Updated ${updateCount} results for ${userCount} users`,
			);

			const leaderboardId = isProd
				? "1101583276667310180"
				: "1417555936733696050";
			const leaderboard = await client.channels.fetch(leaderboardId);
			const month = new Date().getMonth() - 1;

			if (leaderboard && leaderboard.isTextBased() && "send" in leaderboard) {
				const leaderboardResult = DB.getLeaderboardWithBestWPM({ month });

				await (leaderboard as TextChannel).send(formatLeaderboard(
					leaderboardResult,
					{ type: "monthly", month },
				));
			}
		} catch (err) {
			log.error("Error creating monthly leaderboard", { err });
		}
	},
	null,
	true,
);

// Post a leaderboard update every saturday at 9am
new CronJob(
	"0 9 * * 6",
	async () => {
		log.info("[CRON] Updating everyone's score");

		try {
			const { userCount, updateCount } = await DB.updateAll();
			log.success(
				`[ToutMAJ] Updated ${updateCount} results for ${userCount} users`,
			);

			const channelId = isProd ? "1101591223040491682" : "1425221573186682891";
			const cooldownChannel = await client.channels.fetch(channelId);
			const month = new Date().getMonth();

			if (
				cooldownChannel && cooldownChannel.isTextBased() &&
				"send" in cooldownChannel
			) {
				const leaderboardResult = DB.getLeaderboardWithBestWPM({ month });

				await (cooldownChannel as TextChannel).send({
					content: formatLeaderboard(
						leaderboardResult,
						{ type: "temporary", month },
					) +
						"\nVous voulez participer ? N'hésitez pas à lier votre compte avec la commande \`/connexion\` !",
					// Do NOT mention anyone
					allowedMentions: {
						parse: [],
					},
				});
			}
		} catch (err) {
			log.error("Error creating daily leaderboard", { err });
		}
	},
	null,
	true,
);

// Update DB with latest results
new CronJob(
	"@daily",
	async () => {
		log.info("[CRON] Updating everyone's score");

		try {
			const { userCount, updateCount } = await DB.updateAll();
			log.success(
				`[ToutMAJ] Updated ${updateCount} results for ${userCount} users`,
			);
		} catch (err) {
			log.error("Error creating daily leaderboard", { err });
		}
	},
	null,
	true,
);
// #endregion Cron jobs
