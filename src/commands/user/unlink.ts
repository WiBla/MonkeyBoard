import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import { deleteUser, isUserDev } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("unlink")
		.setDescription("Supprimez votre compte et toutes ses données"),
	async execute(interaction: ChatInputCommandInteraction) {
		const text1 = new TextDisplayBuilder().setContent(
			"Vous êtes sur le point de supprimer votre compte MonkeyBoard. Cela supprimera toutes vos données enregistrées, y compris vos résultats et votre profil. Cette action est irréversible.\n\nSi vous êtes sûr de vouloir continuer, cliquez sur le bouton ci-dessous.",
		);
		const button1 = new ButtonBuilder().setCustomId("unlink_confirm").setStyle(
			ButtonStyle.Danger,
		).setLabel("Je suis sûr de vouloir supprimer mon compte");
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button1);

		await interaction.reply({
			components: [text1, row],
			flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
		});
	},
} as Command;

export async function confirm(interaction: ButtonInteraction) {
	let userId = interaction.user.id;

	if (isUserDev(userId)) {
		console.log("[Unlink] Dev user detected, using test ID");
		userId = "287702750366662658";
	}

	await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	try {
		deleteUser(userId);
		return await interaction.editReply({
			content:
				"Votre compte MonkeyBoard a été supprimé avec succès. Toutes vos données ont été effacées.",
		});
	} catch (error) {
		console.error(
			`[Unlink] An error occured while deleting user ${userId}`,
			error,
		);
		return await interaction.editReply({
			content:
				"Une erreur est survenue lors de la suppression de votre compte. Veuillez réessayer plus tard.",
		});
	}
}
