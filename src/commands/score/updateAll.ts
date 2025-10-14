import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import { isUserDev } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("updateall")
		.setDescription("(Dev only) Met à jours les scores de tout le monde"),

	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		if (!isUserDev(userId)) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Vous n'êtes pas autorisé à utiliser cette commande.",
			});
			return;
		}

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: "Travail en cours...",
		});

		const { userCount, updateCount } = await DB.updateAll();
		console.log(
			`[UpdateAll] Updated ${updateCount} results for ${userCount} users`,
		);

		return interaction.editReply({
			content:
				`Mise à jour terminée ! ${updateCount} nouveaux résultats pour ${userCount} utilisateurs.`,
		});
	},
} as Command;
