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

		// Fetch user data from the database
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

		let leaderboard: LeaderboardMapped[] = DB.getLeaderboard({
			uid: user.uid,
		});

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Aucun score trouvé",
			});
			return;
		}

		const bestWPMLastMonth = DB.getBestWPM(user.uid, new Date().getMonth() - 1);
		// console.debug(bestWPMLastMonth);

		leaderboard = leaderboard.map((entry) => {
			const lastPB = bestWPMLastMonth.find((wpm) =>
				wpm.language === entry.language
			)?.wpm;
			return { ...entry, lastPB };
		}) as LeaderboardWithBestWPM[];

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: formatLeaderboard(leaderboard, "personal"),
		});
		return;
	},
} as Command;
