import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../types/client.ts";
import DB from "../../utils/DB.ts";
import Monkey from "../../utils/Monkey.ts";
import { isUserDev } from "../../utils/utils.ts";

export default {
	data: new SlashCommandBuilder()
		.setName("scoremanuel")
		.setDescription("(Dev only) Ajoute un score manuellement")
		.addMentionableOption((author) =>
			author.setName("author").setDescription("author").setRequired(true)
		)
		.addNumberOption((wpm) =>
			wpm.setName("wpm").setDescription("wpm").setRequired(true)
		)
		.addNumberOption((acc) =>
			acc.setName("acc").setDescription("acc").setRequired(true)
		)
		.addStringOption((language) =>
			language.setName("language").setDescription("language").addChoices(
				{ name: "FR", value: "french" },
				{ name: "EN", value: "null" },
				{ name: "FR-600k", value: "french_600k" },
				{ name: "EN-450k", value: "english_450k" },
			).setRequired(true)
		)
		.addBooleanOption((isPB) =>
			isPB.setName("ispb").setDescription("Est-ce un PB?")
		),
	async execute(interaction: ChatInputCommandInteraction) {
		const userId = interaction.user.id;

		// ? We could let users add scores to themselves but we would still require a screenshot as proof
		if (!isUserDev(userId)) {
			await interaction.reply({
				flags: MessageFlags.Ephemeral,
				content: "Vous n'êtes pas autorisé à utiliser cette commande.",
			});
			return;
		}

		// #region Check author for known user
		const author = interaction.options.getUser("author");
		let user: User;

		if (!author) {
			return interaction.reply({
				content: "Impossible de récupérer l'auteur du score",
				flags: MessageFlags.Ephemeral,
			});
		}

		if (DB.userByDiscordIdExists(author.id)) {
			user = DB.getUserByDiscordId(author.id);
		} else {
			const monkey = new Monkey("", author.id);
			monkey.uid = `manual-${author.id}`;
			monkey.name = author.globalName ?? author.displayName;
			DB.addUser(monkey);

			user = DB.getUserByDiscordId(author.id);
			// DB.setDNT(user, true);
		}
		// #endregion Check author for known user

		const wpm = interaction.options.getNumber("wpm");
		const acc = interaction.options.getNumber("acc");
		const language = interaction.options.getString("language");
		const isPB = interaction.options.getBoolean("ispb") ?? false;

		if ([wpm, acc, language, isPB].includes(null)) {
			return interaction.reply({
				content: "Il manque des paramètres obligatoires",
				flags: MessageFlags.Ephemeral,
			});
		}

		DB.addManualResult(user, wpm!, acc!, language!, isPB!);

		return interaction.reply({
			content: `Score enregistré.`,
			flags: MessageFlags.Ephemeral,
		});
	},
} as Command;
