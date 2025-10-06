import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Command } from "../../types/commands.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("unlink")
		.setDescription("Supprimez votre compte et toutes ses données"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("Pong!");
	},
} as Command;
