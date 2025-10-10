import { BaseInteraction, Events } from "discord.js";
import { confirm } from "../commands/user/unlink.ts";
import { Event } from "../types/client.ts";

export default {
	name: Events.InteractionCreate,
	async execute(interaction: BaseInteraction) {
		if (!interaction.isButton()) return;

		console.log(
			`[BOT] ${interaction.user.globalName} clicked button ${interaction.customId}`,
		);

		if (interaction.customId === "unlink_confirm") {
			await confirm(interaction);
		}
	},
} as Event;
