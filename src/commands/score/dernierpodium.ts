import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import { formatLeaderboard } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("dernierpodium")
		.setDescription("(Dev only) Voir le podium du mois précédent"),
	async execute(interaction: ChatInputCommandInteraction) {
		const month = new Date().getMonth() - 1;

		const leaderboard = DB.getLeaderboardWithBestWPM({ month });

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Aucun score trouvé",
			});
			return;
		}

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: formatLeaderboard(
				leaderboard,
				{ type: "monthly", month },
			),
			allowedMentions: {
				parse: [],
			},
		});
	},
} as Command;
