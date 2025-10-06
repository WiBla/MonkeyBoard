import { BaseInteraction, Collection, Events, MessageFlags } from "discord.js";
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

		// #region Commands cooldown check
		const { cooldowns } = interaction.client as TSClient;

		if (!cooldowns.has(command.data.name)) {
			cooldowns.set(command.data.name, new Collection());
		}

		const now = Date.now();
		const timestamps = cooldowns.get(command.data.name);
		const defaultCooldownDuration = 3;
		const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) *
			1_000;

		if (timestamps.has(interaction.user.id)) {
			const expirationTime = timestamps.get(interaction.user.id) +
				cooldownAmount;

			if (now < expirationTime) {
				const expiredTimestamp = Math.round(expirationTime / 1_000);
				return interaction.reply({
					content:
						`La commande "${command.data.name}" sera à nouveau disponible dans <t:${expiredTimestamp}:R>.`,
					flags: MessageFlags.Ephemeral,
				});
			}
		}

		timestamps.set(interaction.user.id, now);
		setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);
		// #endregion Commands cooldown check

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
