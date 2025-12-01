import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { log } from "../../index.ts";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import { formatLeaderboard } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("podium")
		.setDescription("Génère un aperçu du podium")
		// ? add params to toggle acc, pb, diff
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
		const leaderboard = DB.getLeaderboardWithBestWPM();

		if (!leaderboard || leaderboard.length === 0) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Aucun score trouvé",
			});
			return;
		}

		const showTags = interaction.options.getBoolean("tags") ?? true;
		const showDiff = interaction.options.getBoolean("diff") ?? false;
		const showPB = interaction.options.getBoolean("pb") ?? true;

		log.debug("Visibility in leaderboard.ts", { showTags, showDiff, showPB });

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: formatLeaderboard(
				leaderboard,
				{ type: "temporary", visibility: { showTags, showDiff, showPB } },
			),
			allowedMentions: {
				parse: [],
			},
		});
	},
} as Command;
