import {
	InteractionResponseFlags,
	MessageComponentTypes,
} from "discord-interactions";
import { Request } from "express";
import { InteractionResponse } from "../types/discord.d.ts";
import { buildResponse, deleteUser, isDev } from "../utils/utils.ts";

const unlink = async (
	req: Request,
): Promise<InteractionResponse> => {
	let userId = req.body?.member?.user?.id; // Assumes bot is not used in DMs

	if (isDev(userId)) {
		console.log("[Unlink] Dev user detected, using test ID");
		userId = "287702750366662658";
	}

	const success = await deleteUser(userId);

	return buildResponse({
		flags: InteractionResponseFlags.EPHEMERAL,
		components: [{
			type: MessageComponentTypes.TEXT_DISPLAY,
			content: success
				? "Votre compte MonkeyBoard a été supprimé avec succès. Toutes vos données ont été effacées."
				: "Une erreur est survenue lors de la suppression de votre compte. Veuillez réessayer plus tard.",
		}],
	});

	// return buildResponse({
	// 	flags: InteractionResponseFlags.EPHEMERAL,
	// 	components: [{
	// 		type: MessageComponentTypes.TEXT_DISPLAY,
	// 		content:
	// 			"Vous êtes sur le point de supprimer votre compte MonkeyBoard. Cela supprimera toutes vos données enregistrées, y compris vos résultats et votre profil. Cette action est irréversible.\n\nSi vous êtes sûr de vouloir continuer, cliquez sur le bouton ci-dessous.",
	// 	}, {
	// 		type: MessageComponentTypes.ACTION_ROW,
	// 		components: [{
	// 			type: MessageComponentTypes.BUTTON,
	// 			style: ButtonStyles.Danger,
	// 			label: "Je suis sûr de vouloir supprimer mon compte",
	// 		}],
	// 	}],
	// });
};

export default unlink;
