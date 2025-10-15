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
		.setDescription("Génère un aperçu du leaderboard actuel"),
	async execute(interaction: ChatInputCommandInteraction) {
		const leaderboard = DB.getLeaderboardWithBestWPM();

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Aucun score trouvé",
			});
			return;
		}

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: formatLeaderboard(leaderboard, "temporary"),
			allowedMentions: {
				parse: [],
			},
		});
	},
} as Command;
