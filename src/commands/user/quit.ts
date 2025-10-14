import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("quitter")
		.setDescription(
			"Quittez la compétition. Vous pourrez toujours /rejoindre à tout moment",
		),
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

		if (user.dnt === 1) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Vous avez déjà quitté la compétition 👍",
			});
			return;
		}

		DB.setDNT(user, true);

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content:
				"Compris 👍 Vos scores ne sont plus trackés. Si vous changez d'avis, faites la commande \`/rejoindre\` !",
		});
		return;
	},
} as unknown as Command;
