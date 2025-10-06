import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import db from "../../db.ts";
import { Command } from "../../types/commands.ts";
import { formatLeaderboard } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("Génère un aperçu du leaderboard actuel"),
	async execute(interaction: ChatInputCommandInteraction) {
		const leaderboard: LeaderboardMapped[] = db.getLeaderboard();

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
		});
	},
} as Command;
