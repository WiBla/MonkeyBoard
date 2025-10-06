import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/commands.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("Génère un aperçu du leaderboard actuel"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("Pong!");
	},
} as Command;
