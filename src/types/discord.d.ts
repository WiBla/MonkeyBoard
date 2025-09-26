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
	/** Name of the command, 1-32 characters */
	name: string;
	/** Description for `CHAT_INPUT` commands, 1-100 characters. Empty string for `USER` and `MESSAGE` commands */
	description: string;
	/** Type of command, defaults to `1` */
	type: ApplicationCommandTypes;
	/** Installation contexts where the command is available, only for globally-scoped commands. Defaults to your app's configured contexts */
	integration_types: DiscordApplicationIntegrationType[];
	/** 	Interaction context(s) where the command can be used, only for globally-scoped commands. */
	contexts: DiscordInteractionContextType[];
	/** Parameters for the command, max of 25 */
	options?: DiscordInteractionDataOption[];
};

/** https://discord.com/developers/docs/resources/message#embed-object */
type Embed = {
	title?: string; // title of embed
	type?: string; // type of embed (always "rich" for webhook embeds)
	description?: string; // description of embed
	url?: string; // url of embed
	timestamp?: string; // timestamp of embed content
	color?: number; // color code of the embed
	footer?: {
		text: string; // footer text
		icon_url?: string; // url of footer icon (only supports http(s) and attachments)
		proxy_icon_url?: string; // a proxied url of footer icon
	}; // footer information
	image?: {
		url?: string; // source url of image (only supports http(s) and attachments)
		proxy_url?: string; // a proxied url of the image
		height?: number; // height of image
		width?: number; // width of image
	}; // embed image object	// image information
	thumbnail?: {
		url?: string; // source url of thumbnail (only supports http(s) and attachments)
		proxy_url?: string; // a proxied url of the thumbnail
		height?: number; // height of thumbnail
		width?: number; // width of thumbnail
	}; // embed thumbnail object	// thumbnail information
	video?: {
		url?: string; // source url of video
		proxy_url?: string; // a proxied url of the video
		height?: number; // height of video
		width?: number; // width of video
	}; // embed video object	// video information
	provider?: {
		name?: string; // name of provider
		url?: string; // url of provider
	}; // embed provider object	// provider information
	author?: {
		name?: string; // name of author
		url?: string; // url of author
		icon_url?: string; // url of author icon (only supports http(s) and attachments)
		proxy_icon_url?: string; // a proxied url of author icon
	}; // embed author object	// author information
	fields?: EmbedField[]; // fields information
};

/** https://discord.com/developers/docs/resources/message#embed-object-embed-field-structure */
type EmbedField = {
	name: string; // name of the field
	value: string; // value of the field
	inline?: boolean; // whether or not this field should display inline
};

/** https://discord.com/developers/docs/components/reference#component-object */
type Component = {
	type: number;
	items?: { media: { url: string } }[];
	content?: string;
};

/** https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-messages */
type Message = {
	tts?: boolean; // Whether the response is TTS
	content?: string; // Message content
	embeds?: Embed[]; //  Supports up to 10 embeds
	allowed_mentions?: {
		parse?: ("roles" | "users" | "everyone")[]; // An array of allowed mention types to parse from the content
	}; // allowed mentions for the message
	flags?: number; // Message flags combined as a bitfield
	components?: Component[]; // Message components
};

/** https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object */
type InteractionResponse = {
	type: number; // Interaction Callback Type
	data: Message; // Message response data
};
