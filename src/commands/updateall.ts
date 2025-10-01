import {
	InteractionResponseFlags,
	InteractionResponseType,
	MessageComponentTypes,
} from "discord-interactions";
import { Request, Response } from "express";
import { InteractionResponse } from "../types/discord.d.ts";
import { buildResponse, isDev, updateAll } from "../utils/utils.ts";

const updateall = async (
	req: Request,
	res: Response,
): Promise<InteractionResponse> => {
	const _userId = req.body?.member?.user?.id; // Assumes bot is not used in DMs

	if (!isDev(_userId)) {
		return buildResponse({
			flags: InteractionResponseFlags.EPHEMERAL,
			components: [{
				type: MessageComponentTypes.TEXT_DISPLAY,
				content: "Vous n'êtes pas autorisé à utiliser cette commande.",
			}],
		});
	}

	res.send(buildResponse({
		type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
		flags: InteractionResponseFlags.EPHEMERAL,
		components: [{
			type: MessageComponentTypes.TEXT_DISPLAY,
			content: "Travail en cours...",
		}],
	}));

	const { userCount, updateCount } = await updateAll();
	console.log(
		`[UpdateAll] Updated ${updateCount} results for ${userCount} users`,
	);

	// await app.patch("/updatecache", verifyKeyMiddleware(Deno.env.get("PUBLIC_KEY") || ""));

	return buildResponse({
		type: InteractionResponseType.UPDATE_MESSAGE,
		flags: InteractionResponseFlags.EPHEMERAL,
		components: [{
			type: MessageComponentTypes.TEXT_DISPLAY,
			content: "Mise à jour terminée !",
		}],
	});
};

export default updateall;
