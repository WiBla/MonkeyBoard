import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/commands.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDescription("Liez votre compte Monkeytype"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("Pong!");
	},
} as Command;
