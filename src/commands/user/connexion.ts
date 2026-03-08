import {
	ChatInputCommandInteraction,
	MediaGalleryBuilder,
	MessageFlags,
	SlashCommandBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import {
	APIError,
	InactiveApeKeyError,
	InvalidApeKeyError,
} from "../../utils/errors.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("connexion")
		.setDescription("Liez votre compte Monkeytype")
		.addStringOption((option) =>
			option.setName("apekey").setDescription(
				"Une clé d'authentification généré depuis le site",
			).setRequired(false)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply({
			components: [
				new TextDisplayBuilder().setContent("Travail en cours..."),
			],
			flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
		});

		const userId = interaction.user.id;
		const ApeKey = interaction.options.getString("apekey");

		if (!userId) {
			console.error("[APP] Missing userId in request");
			return await interaction.editReply({
				components: [
					new TextDisplayBuilder().setContent(
						"Impossible d'identifier l'utilisateur.",
					),
				],
			});
		}

		let user = DB.getUserByDiscordId(userId);
		const userHasManualResults = user.uid.indexOf("manual-") == 0;

		// If ApeKey provided → try to register
		if (DB.userByDiscordIdExists(userId) && !userHasManualResults) {
			return await interaction.editReply({
				components: [
					new TextDisplayBuilder().setContent(
						"Vous avez déjà lié votre compte !",
					),
				],
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
8. Retapez la commande \`/connexion\` mais indiquez cette fois votre clé obtenue à l'étape 6 à la suite du message

_Considérez cette clé comme un **mot de passe**, elle me donne accès à votre compte Monkeytype, mais soyez rassuré : en dehors de voir vos résultats, je ne peux rien faire avec qui puisse compromettre votre profil._`,
			);

			return await interaction.editReply({
				components: [
					text1,
					gallery,
					text2,
				],
				flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
			});
		}

		try {
			// Register user
			const success = await DB.registerUser(
				userId,
				interaction.user.globalName,
				ApeKey,
			);

			if (!success) {
				return await interaction.editReply({
					components: [
						new TextDisplayBuilder().setContent(
							"Vérifiez que votre clé soit valide",
						),
					],
				});
			}

			if (userHasManualResults) {
				const oldId = user.uid;
				// Get the ID of the user we just created
				user = DB.getUserByToken(ApeKey);

				DB.makeUserReal(oldId, user.uid);
			}

			await interaction.editReply({
				components: [
					new TextDisplayBuilder().setContent(
						"Votre compte a bien été enregistré !",
					),
				],
			});
		} catch (err) {
			if (err instanceof InactiveApeKeyError) {
				await interaction.editReply({
					components: [
						new TextDisplayBuilder().setContent(
							"Votre clé est inactive. Activez-la sur Monkeytype avant de réessayer.",
						),
					],
				});
			} else if (err instanceof InvalidApeKeyError) {
				await interaction.editReply({
					components: [
						new TextDisplayBuilder().setContent("Votre clé est invalide."),
					],
				});
			} else if (err instanceof APIError) {
				await interaction.editReply({
					components: [
						new TextDisplayBuilder().setContent(`Erreur API : ${err.message}`),
					],
				});
			} else {
				await interaction.editReply({
					components: [
						new TextDisplayBuilder().setContent(
							"Une erreur inconnue est survenue.",
						),
					],
				});
			}
			console.error("[Register] Error while trying to register user", err);
		}
	},
} as Command;
