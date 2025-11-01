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
		.setName("leaderboard")
		.setDescription("Génère un aperçu du leaderboard actuel")
		.addBooleanOption((option) =>
			option.setName("ancien").setDescription(
				"Récupère les scores du mois précédent",
			)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const lastMonth = interaction.options.getBoolean("ancien") || false;
		const month = lastMonth ? new Date().getMonth() - 1 : undefined;

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
				lastMonth ? "monthly" : "temporary",
				month,
			),
			allowedMentions: {
				parse: [],
			},
		});
	},
} as Command;
