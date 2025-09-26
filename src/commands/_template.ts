import {
	InteractionResponseFlags,
	MessageComponentTypes,
} from "discord-interactions";
import { Request } from "express";
import { InteractionResponse } from "../types/discord.d.ts";
import { buildResponse } from "../utils/utils.ts";

const template = async (
	req: Request,
): Promise<InteractionResponse> => {
	const _userId = req.body?.member?.user?.id; // Assumes bot is not used in DMs

	return buildResponse({
		flags: InteractionResponseFlags.EPHEMERAL,
		components: [{
			type: MessageComponentTypes.TEXT_DISPLAY,
			content: "Cette fonctionnalité n'est pas encore implémentée.",
		}],
	});
};

export default template;
