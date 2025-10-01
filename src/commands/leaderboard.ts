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
const leaderboard = async (
	_req: Request,
): Promise<InteractionResponse> => {
	const leaderboard: LeaderboardMapped[] = db.getLeaderboard();

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
			content: formatLeaderboard(leaderboard, "temporary"),
		}],
	});
};

export default leaderboard;
