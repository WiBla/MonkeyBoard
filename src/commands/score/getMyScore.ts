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
		.setName("getmyscore")
		.setDescription("Récupère votre score du mois"),
	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		const user = DB.getUserByDiscordId(userId);
		if (!user) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Vous n'avez pas encore lié votre ApeKey. Utilisez la commande \`/register\` pour le faire.",
			});
			return;
		}

		if (user.dnt) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Vous avez quitté la compétition. Utilisez \`/rejoindre\` si vous souhaitez à nouveau participer !",
			});
			return;
		}

		const leaderboard = DB.getLeaderboardWithBestWPM({ uid: user.uid });

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
