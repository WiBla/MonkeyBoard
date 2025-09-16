import "dotenv/config";
import express from "express";
import {
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware,
} from "discord-interactions";
import { RegisterUser } from "./utils.js";

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

				let components = [];

				if (ApeKey?.value === undefined) {
					components = [
						{
							type: MessageComponentTypes.TEXT_DISPLAY,
							content:
								"Veuillez générer une ApeKey pour nous aider à tracker vos scores :",
						},
						{
							type: MessageComponentTypes.MEDIA_GALLERY,
							items: [
								{ media: { url: "https://i.imgur.com/d2f3mgG.png" } },
								{ media: { url: "https://i.imgur.com/VBdpHla.png" } },
								{ media: { url: "https://i.imgur.com/bQFU9a4.png" } },
								{ media: { url: "https://i.imgur.com/S8b5z2y.png" } },
							],
						},
						{
							type: MessageComponentTypes.TEXT_DISPLAY,
							content: `1. Allez sur monkeytype.com, mettez la souris sur votre profile
2. Une liste apparaît, cliquez sur "Account settings" (paramètres de compte)
3. Dans le menu qui apparaît, accédez à la section "ape keys"
4. Cliquez sur "generate new key"
5. Donnez-lui un nom reconnaîssable, dans cet exemple "CTC-WPM"
6. Copiez le contenu de la boîte de dialogue qui apparaît, ceci est votre clé d'authentification. Gardez la secrète !
7. Pensez à activer votre clé fraîchement généré
8. Retapez la commande /register mais indiquez votre clé obtenu à l'étape 6 à la suite du message`,
						},
					];
				} else {
					await RegisterUser(ApeKey.value);

					components = [
						{
							type: MessageComponentTypes.TEXT_DISPLAY,
							content: "Votre compte à bien été enregistré !",
						},
					];
				}

				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags:
							InteractionResponseFlags.EPHEMERAL |
							InteractionResponseFlags.IS_COMPONENTS_V2,
						components,
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
