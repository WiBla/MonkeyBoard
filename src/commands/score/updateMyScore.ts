import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import db from "../../db.ts";
import Monkey from "../../monkey.ts";
import { Command } from "../../types/commands.ts";

export default {
	cooldown: 1800, // 30 mins
	data: new SlashCommandBuilder()
		.setName("updatemyscore")
		.setDescription("Met à jours vos scores"),
	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		// Fetch user data from the database
		const user = db.getUserByDiscordId(userId);
		if (!user) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content:
					"Vous n'avez pas encore lié votre ApeKey. Utilisez la commande /register pour le faire.",
			});
			return;
		}

		const monkey = new Monkey(user.apeKey || "");
		monkey.completeProfileFromDB();
		const newResults = await monkey.updateResults();

		await interaction.reply({
			flags: MessageFlags.Ephemeral,
			content:
				`Vos scores ont été mis à jour ! ${newResults} nouveaux résultat(s) ont été ajouté(s).`,
		});
	},
} as Command;
