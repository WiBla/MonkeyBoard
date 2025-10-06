import { BaseInteraction, Events, MessageFlags } from "discord.js";
import { TSClient } from "..//types/client.ts";

export default {
	name: Events.InteractionCreate,
	async execute(interaction: BaseInteraction) {
		if (!interaction.isChatInputCommand()) return;

		const command = (interaction.client as TSClient).commands.get(
			interaction.commandName,
		);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error("[BOT]", error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: "There was an error whlie executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	},
};
