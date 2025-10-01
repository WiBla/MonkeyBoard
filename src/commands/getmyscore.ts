import {
	InteractionResponseFlags,
	MessageComponentTypes,
} from "discord-interactions";
import { Request } from "express";
import db from "../db.ts";
import { InteractionResponse } from "../types/discord.d.ts";
import { LeaderboardMapped } from "../types/models.d.ts";
import { buildResponse, formatLeaderboard } from "../utils/utils.ts";

// deno-lint-ignore require-await
const getmyscore = async (
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

	const leaderboard: LeaderboardMapped[] = db.getLeaderboard({ uid: user.uid });

	if (!leaderboard || leaderboard.length === 0) {
		return buildResponse({
			flags: InteractionResponseFlags.EPHEMERAL,
			components: [{
				type: MessageComponentTypes.TEXT_DISPLAY,
				content: "Aucun score trouvé",
			}],
		});
	}

	return buildResponse({
		flags: InteractionResponseFlags.EPHEMERAL,
		components: [{
			type: MessageComponentTypes.TEXT_DISPLAY,
			content: formatLeaderboard(leaderboard, "personal"),
		}],
	});
};

export default getmyscore;
