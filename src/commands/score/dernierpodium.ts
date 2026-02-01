import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import {
	formatLeaderboard,
	getMonthName,
	MonthOffset,
} from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("dernierpodium")
		.setDescription("(Dev only) Voir le podium du mois précédent"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: "Travail en cours...",
		});

		const leaderboard = DB.getLeaderboardWithBestWPM({
			offset: MonthOffset.Compare,
		});

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.editReply({
				content: "Aucun score trouvé",
			});
			return;
		}

		await interaction.editReply({
			content: formatLeaderboard(
				leaderboard,
				{ type: "monthly", monthName: getMonthName(MonthOffset.Previous) },
			),
			allowedMentions: {
				parse: [],
			},
		});
	},
} as Command;
