import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/commands.ts";

export default {
	cooldown: 1800, // 30 mins
	data: new SlashCommandBuilder()
		.setName("updatemyscore")
		.setDescription("Met à jours vos scores"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("Pong!");
	},
} as Command;
