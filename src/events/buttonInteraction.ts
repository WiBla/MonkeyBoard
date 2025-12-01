import { BaseInteraction, Events } from "discord.js";
import { confirm } from "../commands/user/deconnexion.ts";
import { log } from "../index.ts";
import { Event } from "../types/client.ts";

export default {
	name: Events.InteractionCreate,
	async execute(interaction: BaseInteraction) {
		if (!interaction.isButton()) return;

		log.info(
			`${interaction.user.globalName} clicked button ${interaction.customId}`,
		);

		if (interaction.customId === "unlink_confirm") {
			await confirm(interaction);
		}
	},
} as Event;
