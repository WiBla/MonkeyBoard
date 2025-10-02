import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/commands.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Replies with Pong!"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("Pong!");
	},
} as Command;
