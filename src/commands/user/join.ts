import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { db } from "../../index.ts";
import { Command } from "../../types/client.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("rejoindre")
		.setDescription(
			"Rejoindre la compétition. Vous pourrez toujours /quitter si vous changez d'avis.",
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		// Fetch user data from the database
		const user = db.getUserByDiscordId(userId);
		if (!user) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Vous n'avez pas encore lié votre ApeKey. Utilisez la commande \`/register\` pour le faire.",
			});
			return;
		}

		if (user.dnt === 0) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Vous avez déjà rejoins la compétition 👍",
			});
			return;
		}

		db.setDNT(user, false);

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content:
				"Compris 👍 Vos scores sont à nouveau trackés. Si vous changez d'avis, faites la commande \`/quitter\` !",
		});
		return;
	},
} as Command;
