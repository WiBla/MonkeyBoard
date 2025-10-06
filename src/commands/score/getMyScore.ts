import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/commands.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("getmyscore")
		.setDescription("Récupère votre score du mois"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("Pong!");
	},
} as Command;
