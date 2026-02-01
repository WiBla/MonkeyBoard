import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import { timestampToReadableDate } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("monprofile")
		.setDescription(
			"Affiche toutes les informations lié à votre compte.",
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		// Fetch user data from the database
		const user = DB.getUserByDiscordId(userId);

		if (!user) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Vous n'avez pas encore lié votre ApeKey. Utilisez la commande \`/connexion\` pour le faire.",
			});
			return;
		}

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: "Travail en cours...",
		});

		const tags = DB.getTags(user.uid);
		const results = DB.getResults(user.uid);

		let tagsSummary = "";
		let resultsSummary = "";
		for (const tag of tags) {
			const nbrOfUse = DB.countResultsWithTag(tag.id);
			const bestWPM = DB.getTagBestWPM(tag.id);
			const bestFR = DB.getTagBestFRWPM(tag.id);
			const bestEN = DB.getTagBestENWPM(tag.id);

			// console.debug({ nbrOfUse, bestWPM, bestFR, bestEN });

			tagsSummary += `- ${tag.name} utilisé ${
				nbrOfUse?.total ?? 0
			} fois, PB : **${bestWPM?.wpm.toFixed(0) ?? 0}** (global), PB FR : **${
				bestFR?.wpm.toFixed(0) ?? 0
			}** ${timestampToReadableDate(bestFR?.timestamp)}, PB EN : **${
				bestEN?.wpm.toFixed(0) ?? 0
			}** ${timestampToReadableDate(bestEN?.timestamp)}\n`;
		}

		/*
      Scores :
      Nmbr total de scores :
      Best FR : wpm, acc, tags, date
      Best FR 600k :
      Best EN :
      Best EN 450k :
    */

		await interaction.editReply({
			content: `Clé valide ? ${user.isActive ? "oui" : "non"}
Dans la compétition ? ${!user.dnt ? "oui" : "non"}
## Tags
${tagsSummary}
## Scores (${results.length})
${resultsSummary}
`,
		});
		return;
	},
} as Command;
