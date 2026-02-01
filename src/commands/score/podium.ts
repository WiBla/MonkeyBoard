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
		.setName("podium")
		.setDescription("Génère un aperçu du podium")
		.addBooleanOption((showTags) =>
			showTags.setName("tags").setDescription("Voir les tags")
		)
		.addBooleanOption((showDiff) =>
			showDiff.setName("diff").setDescription(
				"Voir la différence avec le mois précédent",
			)
		)
		.addBooleanOption((showPB) =>
			showPB.setName("pb").setDescription("Voir si c'est un PB")
		),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: "Travail en cours...",
		});

		const leaderboard = DB.getLeaderboardWithBestWPM();

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.editReply({
				content: "Aucun score trouvé",
			});
			return;
		}

		const showTags = interaction.options.getBoolean("tags") ?? true;
		const showDiff = interaction.options.getBoolean("diff") ?? false;
		const showPB = interaction.options.getBoolean("pb") ?? true;

		await interaction.editReply({
			content: formatLeaderboard(
				leaderboard,
				{
					type: "temporary",
					monthName: getMonthName(MonthOffset.Now),
					visibility: { showTags, showDiff, showPB },
				},
			),
			allowedMentions: {
				parse: [],
			},
		});
	},
} as Command;
