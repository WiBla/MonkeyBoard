import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { db } from "../../index.ts";
import { Command } from "../../types/client.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("quitter")
		.setDescription(
			"Quittez la compétition. Vous pourrez toujours /rejoindre à tout moment",
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

		if (user.dnt === 1) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Vous avez déjà quitté la compétition 👍",
			});
			return;
		}

		db.setDNT(user, true);

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content:
				"Compris 👍 Vos scores ne sont plus trackés. Si vous changez d'avis, faites la commande \`/rejoindre\` !",
		});
		return;
	},
} as Command;
