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
		.setName("voirmonscore")
		.setDescription("Récupère votre score du mois"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: "Travail en cours...",
		});

		const userId = interaction.user.id;

		const user = DB.getUserByDiscordId(userId);
		if (!user) {
			await interaction.editReply({
				content:
					"Vous n'avez pas encore lié votre ApeKey. Utilisez la commande \`/connexion\` pour le faire.",
			});
			return;
		}

		if (user.dnt) {
			await interaction.editReply({
				content:
					"Vous avez quitté la compétition. Utilisez \`/rejoindre\` si vous souhaitez à nouveau participer !",
			});
			return;
		}

		const leaderboard = DB.getLeaderboardWithBestWPM({ uid: user.uid });

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.editReply({
				content: "Aucun score trouvé",
			});
			return;
		}

		await interaction.editReply({
			content: formatLeaderboard(leaderboard, {
				type: "personal",
				monthName: getMonthName(MonthOffset.Now),
				visibility: { showDiff: true, showPB: true, showTags: true },
			}),
		});
		return;
	},
} as Command;
