import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import Monkey from "../../utils/Monkey.ts";

export default {
	cooldown: 1800, // 30 mins
	data: new SlashCommandBuilder()
		.setName("actualiser")
		.setDescription("Met à jours vos scores"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content: "⌛",
		});

		const userId = interaction.user.id;

		// Fetch user data from the database
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

		const monkey = new Monkey(user.apeKey || "");
		monkey.completeProfileFromDB();
		const newResults = await monkey.updateResults();
		const tags = await monkey.updateTags();

		await interaction.editReply({
			content:
				`Vos scores ont été mis à jour ! ${newResults} nouveaux résultat(s) ont été ajouté(s). Vous avez ${tags.length} tag(s)`,
		});
	},
} as Command;
