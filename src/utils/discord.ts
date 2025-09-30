/** https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-types */
export enum ApplicationCommandTypes {
	/** A text-based command that shows up when a user types `/` */
	ChatInput = 1,
	/** A UI-based command that shows up when you right click or tap on a user */
	User,
	/** A UI-based command that shows up when you right click or tap on a message */
	Message,
	/** A UI-based command that represents the primary way to invoke an app's Activity */
	PrimaryEntryPoint,
}

/** https://discord.com/developers/docs/resources/application#application-object-application-integration-types */
export enum DiscordApplicationIntegrationType {
	/** App is installable to servers */
	GuildInstall = 0,
	/** App is installable to users */
	UserInstall = 1,
}

/** https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object-interaction-context-types */
export enum DiscordInteractionContextType {
	/** Interaction can be used within servers */
	Guild = 0,
	/** Interaction can be used within DMs with the app's bot user */
	BotDm = 1,
	/** Interaction can be used within Group DMs and DMs other than the app's bot user */
	PrivateChannel = 2,
}

/** https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type */
export enum ApplicationCommandOptionTypes {
	SubCommand = 1,
	SubCommandGroup,
	String,
	/** Any integer between -2^53 and 2^53 */
	Integer,
	Boolean,
	User,
	/** Includes all channel types + categories */
	Channel,
	Role,
	/** Includes users and roles */
	Mentionable,
	/** Any double between -2^53 and 2^53 */
	Number,
	/** Attachment object */
	Attachment,
}

/** https://discord.com/developers/docs/components/reference#button-button-styles */
export enum ButtonStyles {
	Primary = 1,
	Secondary,
	Success,
	Danger,
	Link,
	Premium,
}
