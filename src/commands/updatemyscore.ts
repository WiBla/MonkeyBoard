import {
	InteractionResponseFlags,
	MessageComponentTypes,
} from "discord-interactions";
import { Request } from "express";
import db from "../db.ts";
import Monkey from "../monkey.ts";
import { InteractionResponse } from "../types/discord.d.ts";
import { buildResponse } from "../utils/utils.ts";

const updatemyscore = async (
	req: Request,
): Promise<InteractionResponse> => {
	const userId = req.body?.member?.user?.id; // Assumes bot is not used in DMs

	// Fetch user data from the database
	const user = db.getUserByDiscordId(userId);
	if (!user) {
		return buildResponse({
			flags: InteractionResponseFlags.EPHEMERAL,
			components: [{
				type: MessageComponentTypes.TEXT_DISPLAY,
				content:
					"Vous n'avez pas encore lié votre ApeKey. Utilisez la commande /register pour le faire.",
			}],
		});
	}

	const monkey = new Monkey(user.apeKey || "");
	monkey.completeProfileFromDB();
	const newResults = await monkey.updateResults();

	return buildResponse({
		flags: InteractionResponseFlags.EPHEMERAL,
		components: [{
			type: MessageComponentTypes.TEXT_DISPLAY,
			content:
				`Vos scores ont été mis à jour ! ${newResults} nouveaux résultats ont été ajoutés.`,
		}],
	});
};

export default updatemyscore;
