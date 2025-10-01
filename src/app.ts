import { CronJob } from "cron";
import {
	InteractionResponseType,
	InteractionType,
	verifyKeyMiddleware,
} from "discord-interactions";
import { Client, Events, GatewayIntentBits, TextChannel } from "discord.js";
import express, { Request, Response } from "express";
import commands from "./commands/index.ts";
import db from "./db.ts";
import { formatLeaderboard, updateAll } from "./utils/utils.ts";

const DISCORD_TOKEN = Deno.env.get("DISCORD_TOKEN");
const PUBLIC_KEY = Deno.env.get("PUBLIC_KEY");
const PORT = Deno.env.get("PORT") || 3000;

if (!PUBLIC_KEY || !PORT || !DISCORD_TOKEN) {
	console.error(".env file not properly configured");
	Deno.exit(1);
}

export const app = express();

/**
 * Handle incoming interactions
 */
app.post(
	"/interactions",
	verifyKeyMiddleware(PUBLIC_KEY || ""),
	async (req: Request, res: Response) => {
		const { type, data } = req.body;

		// Handle Discord verification
		if (type === InteractionType.PING) {
			return res.send({ type: InteractionResponseType.PONG });
		}

		// Handle slash commands
		if (type === InteractionType.APPLICATION_COMMAND) {
			const { name }: { name: string } = data;
			const handler = commands[name];

			if (typeof handler !== "function") {
				console.error(`[APP] Unknown command: ${name}`);
				return res.status(400).json({ error: "unknown command" });
			}
			if (!handler) {
				console.error(`[APP] Unknown command: ${name}`);
				return res.status(400).json({ error: "unknown command" });
			}

			try {
				const response = await handler(req, res);
				return res.send(response);
			} catch (err) {
				console.error(`[APP] Error in command "${name}":`, err);
				return res.status(500).json({ error: "internal error" });
			}
		}

		console.error("[APP] Unknown interaction type:", type);
		return res.status(400).json({ error: "unknown interaction type" });
	},
);

app.listen(PORT, () => {
	console.log("[APP] Listening on port", PORT);

	// console.debug(db.getLeaderboard());
});

/*
 * Discord Bot Setup
 */
export const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
	console.log(`[BOT] Logged in as ${readyClient.user.tag}`);
});

client.login(DISCORD_TOKEN);

// Cron job to get leaderboard every 1st of the month at 9am
const job = new CronJob(
	"0 9 1 * *",
	async () => {
		console.log("Fetching latest leaderboard data..");

		try {
			const { userCount, updateCount } = await updateAll();
			console.log(
				`[UpdateAll] Updated ${updateCount} results for ${userCount} users`,
			);

			const leaderboard = await client.channels.fetch("1417555936733696050");
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
