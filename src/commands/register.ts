import {
	InteractionResponseFlags,
	MessageComponentTypes,
} from "discord-interactions";
import { Request } from "express";
import db from "../db.ts";
import { InteractionResponse } from "../types/discord.d.ts";
import { buildResponse, isDev, registerUser } from "../utils/utils.ts";

const register = async (
	req: Request,
): Promise<InteractionResponse> => {
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
					content:
						`1. Allez sur monkeytype.com, mettez la souris sur votre profil
2. Une liste apparaît, cliquez sur "Account settings" (paramètres de compte)
3. Dans le menu qui apparaît, accédez à la section "ape keys"
4. Cliquez sur "generate new key"
5. Donnez-lui un nom reconnaissable, dans cet exemple "CTC-WPM"
6. Copiez le contenu de la boîte de dialogue qui apparaît, ceci est votre clé d'authentification. Gardez-la secrète !
7. Pensez à activer votre clé fraîchement générée
8. Retapez la commande \`/register\` mais indiquez cette fois votre clé obtenue à l'étape 6 à la suite du message

_Considérez cette clé comme un **mot de passe**, elle me donne accès à votre compte Monkeytype, mais soyez rassuré : en dehors de voir vos résultats, je ne peux rien faire avec qui puisse compromettre votre profil._`,
				},
			],
		});
	}

	// If ApeKey provided → try to register
	if (!isDev(userId) && db.userByDiscordIdExists(userId)) {
		return buildResponse({
			flags: InteractionResponseFlags.EPHEMERAL,
			components: [
				{
					type: MessageComponentTypes.TEXT_DISPLAY,
					content: "Vous avez déjà un compte MonkeyBoard enregistré.",
				},
			],
		});
	}

	const success = await registerUser(userId, ApeKey);

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
};

export default register;
