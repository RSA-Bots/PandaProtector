import type { Snowflake } from "discord.js";

export interface Config {
	guildId: Snowflake;
	memberRoleId: Snowflake;
	staffRoleId: Snowflake;
	developerRoleId: Snowflake;
	showcaseChannelId: Snowflake;
	reportChannelId: Snowflake;
	botChannelId: Snowflake;
	staffCategoryId: Snowflake;
	ghRepoPath: string;
	verbosityLevel: string;
	logChannelId: Snowflake;
	qaChannelId: Snowflake;
}

export function isConfig(config: unknown): config is Config {
	const record = config as { [index: string]: unknown };

	return (
		typeof config === "object" &&
		config !== null &&
		typeof record["guildId"] === "string" &&
		typeof record["memberRoleId"] === "string" &&
		typeof record["staffRoleId"] === "string" &&
		typeof record["developerRoleId"] === "string" &&
		typeof record["showcaseChannelId"] === "string" &&
		typeof record["reportChannelId"] === "string" &&
		typeof record["botChannelId"] === "string" &&
		typeof record["staffCategoryId"] === "string" &&
		typeof record["ghRepoPath"] === "string" &&
		typeof record["verbosityLevel"] === "string" &&
		typeof record["logChannelId"] === "string" &&
		typeof record["qaChannelId"] === "string"
	);
}
