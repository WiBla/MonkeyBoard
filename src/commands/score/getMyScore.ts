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
		.setName("getmyscore")
		.setDescription("Récupère votre score du mois"),
	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		// Fetch user data from the database
		const user = db.getUserByDiscordId(userId);
		if (!user) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Vous n'avez pas encore lié votre ApeKey. Utilisez la commande /register pour le faire.",
			});
			return;
		}

		const leaderboard: LeaderboardMapped[] = db.getLeaderboard({
			uid: user.uid,
		});

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Aucun score trouvé",
			});
			return;
		}

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: formatLeaderboard(leaderboard, "personal"),
		});
		return;
	},
} as Command;
