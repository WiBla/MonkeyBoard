import {
	ApplicationCommandOptionTypes,
	ApplicationCommandTypes,
	DiscordApplicationIntegrationType,
	DiscordInteractionContextType,
} from "../utils/discord.ts";

/** https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object-application-command-interaction-data-option-structure */
type DiscordInteractionDataOption = {
	/** Name of the parameter */
	name: string;
	/** Value of application command option type */
	type: ApplicationCommandOptionTypes;
	/** 1-100 character description */
	description?: string;
	/** Whether the parameter is required or optional, default `false` */
	required?: boolean;
	/** Value of the option resulting from user input */
	value?: string | boolean | number;
	/** Present if this option is a group or subcommand */
	options?: DiscordInteractionDataOption[];
	/** `true` if this option is the currently focused option for autocomplete */
	focused?: boolean;
};

/** https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-structure */
type Command = {
	name: string;
	description: string;
	/** @see ApplicationCommandType Type of command, defaults to `1` */
	type: ApplicationCommandTypes;
	integration_types: DiscordApplicationIntegrationType[];
	contexts: DiscordInteractionContextType[];
	options?: DiscordInteractionDataOption[];
};
