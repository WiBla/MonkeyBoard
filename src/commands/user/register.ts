import {
	ChatInputCommandInteraction,
	MediaGalleryBuilder,
	MessageFlags,
	SlashCommandBuilder,
	TextDisplayBuilder,
} from "discord.js";
import db from "../../db.ts";
import { Command } from "../../types/commands.ts";
import { isUserDev, registerUser } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDescription("Liez votre compte Monkeytype")
		.addStringOption((option) =>
			option.setName("apekey").setDescription(
				"Une clé d'authentification généré depuis le site",
			).setRequired(false)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;
		const ApeKey = interaction.options.getString("apekey");

		if (!userId) {
			console.error("[APP] Missing userId in request");
			return await interaction.reply({
				content: "Impossible d'identifier l'utilisateur.",
				flags: MessageFlags.Ephemeral,
			});
		}

		// If no ApeKey provided → show help
		if (!ApeKey) {
			const text1 = new TextDisplayBuilder().setContent(
				"Veuillez générer une ApeKey pour nous aider à tracker vos scores :",
			);
			const gallery = new MediaGalleryBuilder().addItems(
				(mediaGalleryItem) =>
					mediaGalleryItem.setURL("https://i.imgur.com/d2f3mgG.png"),
				(mediaGalleryItem) =>
					mediaGalleryItem.setURL("https://i.imgur.com/VBdpHla.png"),
				(mediaGalleryItem) =>
					mediaGalleryItem.setURL("https://i.imgur.com/bQFU9a4.png"),
				(mediaGalleryItem) =>
					mediaGalleryItem.setURL("https://i.imgur.com/S8b5z2y.png"),
			);
			const text2 = new TextDisplayBuilder().setContent(
				`1. Allez sur monkeytype.com, mettez la souris sur votre profil
2. Une liste apparaît, cliquez sur "Account settings" (paramètres de compte)
3. Dans le menu qui apparaît, accédez à la section "ape keys"
4. Cliquez sur "generate new key"
5. Donnez-lui un nom reconnaissable, dans cet exemple "CTC-WPM"
6. Copiez le contenu de la boîte de dialogue qui apparaît, ceci est votre clé d'authentification. Gardez-la secrète !
7. Pensez à activer votre clé fraîchement générée
8. Retapez la commande \`/register\` mais indiquez cette fois votre clé obtenue à l'étape 6 à la suite du message

_Considérez cette clé comme un **mot de passe**, elle me donne accès à votre compte Monkeytype, mais soyez rassuré : en dehors de voir vos résultats, je ne peux rien faire avec qui puisse compromettre votre profil._`,
			);

			return await interaction.reply({
				components: [
					text1,
					gallery,
					text2,
				],
				flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
			});
		}

		// If ApeKey provided → try to register
		if (!isUserDev(userId) && db.userByDiscordIdExists(userId)) {
			return await interaction.reply({
				content: "Vous avez déjà un compte MonkeyBoard enregistré.",
				flags: MessageFlags.Ephemeral,
			});
		}

		await interaction.reply({
			content: "Création de votre compte...",
			flags: MessageFlags.Ephemeral,
		});

		const success = await registerUser(userId, ApeKey);

		if (!success) {
			await interaction.editReply("Vérifiez que votre clé soit valide");
		} else {
			await interaction.editReply("Votre compte a bien été enregistré !");
		}

		setTimeout(async () => {
			await interaction.deleteReply();
		}, 5_000);
	},
} as Command;
