import "dotenv/config";
import express from "express";
import {
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware,
} from "discord-interactions";
import { buildResponse, RegisterUser } from "./utils.js";

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Slash command handlers
 */
const commands = {
	test: () =>
		buildResponse({
			components: [
				{
					type: MessageComponentTypes.TEXT_DISPLAY,
					content: "hello world !",
				},
			],
		}),

	register: async (req) => {
		const userId = req.body?.member?.user?.id; // Assumes bot is not used in DMs
		const ApeKey = req.body.data?.options?.[0]?.value;

		if (!userId) {
			console.error("[APP] Missing userId in request");
			return buildResponse({
				flags: InteractionResponseFlags.EPHEMERAL,
				components: [
					{
						type: MessageComponentTypes.TEXT_DISPLAY,
						content: "Impossible d'identifier l'utilisateur.",
					},
				],
			});
		}

		// If no ApeKey provided → show help
		if (!ApeKey) {
			return buildResponse({
				flags: InteractionResponseFlags.EPHEMERAL,
				components: [
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
						content: `1. Allez sur monkeytype.com, mettez la souris sur votre profil
2. Une liste apparaît, cliquez sur "Account settings" (paramètres de compte)
3. Dans le menu qui apparaît, accédez à la section "ape keys"
4. Cliquez sur "generate new key"
5. Donnez-lui un nom reconnaissable, dans cet exemple "CTC-WPM"
6. Copiez le contenu de la boîte de dialogue qui apparaît, ceci est votre clé d'authentification. Gardez-la secrète !
7. Pensez à activer votre clé fraîchement générée
8. Retapez la commande /register mais indiquez votre clé obtenue à l'étape 6 à la suite du message`,
					},
				],
			});
		}

		// If ApeKey provided → try to register
		const success = await RegisterUser(userId, ApeKey);

		if (!success) {
			return buildResponse({
				flags: InteractionResponseFlags.EPHEMERAL,
				components: [
					{
						type: MessageComponentTypes.TEXT_DISPLAY,
						content: "Vérifiez que votre clé soit valide",
					},
				],
			});
		}

		return buildResponse({
			flags: InteractionResponseFlags.EPHEMERAL,
			components: [
				{
					type: MessageComponentTypes.TEXT_DISPLAY,
					content: "Votre compte a bien été enregistré !",
				},
			],
		});
	},
};

/**
 * Handle incoming interactions
 */
app.post(
	"/interactions",
	verifyKeyMiddleware(process.env.PUBLIC_KEY),
	async (req, res) => {
		const { type, data } = req.body;

		// Handle Discord verification
		if (type === InteractionType.PING) {
			return res.send({ type: InteractionResponseType.PONG });
		}

		// Handle slash commands
		if (type === InteractionType.APPLICATION_COMMAND) {
			const { name } = data;
			const handler = commands[name];

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
});
