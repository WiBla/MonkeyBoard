import "dotenv/config";
import express from "express";
import {
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware,
} from "discord-interactions";

// Create an express app
const app = express();
const PORT = process.env.PORT || 3000;

app.post(
	"/interactions",
	verifyKeyMiddleware(process.env.PUBLIC_KEY),
	async function (req, res) {
		// Interaction id, type and data
		const { id, type, data } = req.body;

		/**
		 * Handle verification requests
		 */
		if (type === InteractionType.PING) {
			return res.send({ type: InteractionResponseType.PONG });
		}

		/**
		 * Handle slash command requests
		 * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
		 */
		if (type === InteractionType.APPLICATION_COMMAND) {
			const { name } = data;

			// "test" command
			if (name === "test") {
				// Send a message into the channel where command was triggered from
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: `hello world !`,
							},
						],
					},
				});
			}

			if (name === "register") {
				const userId = req.body.member.user.id; // This assumes the bot never runs in a DM
				const ApeKey = data?.options?.[0];
				console.log({ userId, data, ApeKey });

				let content = "";

				if (ApeKey?.value === undefined) {
					content =
						"Pour lier votre compte monkeytype au serveur, suivez les instructions suivantes :";
				} else {
					content = "Nous avons bien lié votre compte !";
				}

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags:
							InteractionResponseFlags.EPHEMERAL |
							InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [
							{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content,
							},
						],
					},
				});
			}

			console.error(`unknown command: ${name}`);
			return res.status(400).json({ error: "unknown command" });
		}

		console.error("unknown interaction type", type);
		return res.status(400).json({ error: "unknown interaction type" });
	}
);

app.listen(PORT, () => {
	console.log("Listening on port", PORT);
});
