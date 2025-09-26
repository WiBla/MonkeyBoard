import {
	InteractionResponseType,
	InteractionType,
	verifyKeyMiddleware,
} from "discord-interactions";
import express, { Request, Response } from "express";
import commands from "./commands/index.ts";

const PUBLIC_KEY = Deno.env.get("PUBLIC_KEY");
const PORT = Deno.env.get("PORT") || 3000;

if (!PUBLIC_KEY || !PORT) {
	console.error(".env file not properly configured");
	Deno.exit(1);
}

const app = express();

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
				const response = await handler(req);
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
