import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import { writeFile } from "fs";
import type { Command } from "../command";
import { canUpdateVerbosity, log } from "../logger";
import { getState } from "../store/state";

const command: Command = {
	name: "config",
	description: "Gets and updates config values, do not specify a name to list all config entries.",
	options: [
		{
			type: "STRING",
			name: "name",
			description: "The config name (case-sensitive).",
			choices: [
				{
					name: "Guild Id",
					value: "guildId",
				},
				{
					name: "Member Role Id",
					value: "memberRoleId",
				},
				{
					name: "Staff Role Id",
					value: "staffRoleId",
				},
				{
					name: "Developer Role Id",
					value: "developerRoleId",
				},
				{
					name: "Showcase Channel Id",
					value: "showcaseChannelId",
				},
				{
					name: "Report Channel Id",
					value: "reportChannelId",
				},
				{
					name: "Bot Channel Id",
					value: "botChannelId",
				},
				{
					name: "Staff Category Id",
					value: "staffCategoryId",
				},
				{
					name: "Github Repository Path",
					value: "ghRepoPath",
				},
				{
					name: "Debug Mode",
					value: "debugMode",
				},
				{
					name: "Debug Channel Id",
					value: "debugChannelId",
				},
			],
		},
		{
			type: "STRING",
			name: "value",
			description: "The new value for the config.",
		},
	],
	hasPermission: interaction =>
		(interaction.member as GuildMember).roles.cache.has(getState().config.developerRoleId),
	shouldBeEphemeral: interaction =>
		(interaction.channel as TextChannel).parent?.id !== getState().config.staffCategoryId,
	handler: (interaction, args) => {
		const name = args.get("name")?.value as string | undefined;
		const value = args.get("value")?.value as string | undefined;
		const { config, configPath } = getState();

		if (name) {
			// Get or update config.
			if (name in config) {
				if (value) {
					// TODO: a more scalable approach to sanity checking config.
					if (name === "debugMode") {
						if (!canUpdateVerbosity(value)) {
							interaction
								.reply(`Could not update debugMode in config due to an unsupported verbosity level.`)
								.catch(err => log(err, "error"));
							return false;
						}
					}
					// Update config value.
					config[name as keyof typeof config] = value as `${bigint}`;

					writeFile(configPath, JSON.stringify(config), err => {
						if (!err) {
							interaction
								.reply({
									content: `Updated config ${name}.`,
									ephemeral: command.shouldBeEphemeral(interaction),
								})
								.catch(err => log(err, "error"));
						} else {
							log(err.message, "error");

							interaction
								.reply({
									content: `Updated config ${name}, but could not save to file: ${err.message}.`,
									ephemeral: command.shouldBeEphemeral(interaction),
								})
								.catch(err => log(err, "error"));
						}
					});
				} else {
					// Get config value.
					interaction
						.reply({ content: `${name}: ${config[name as keyof typeof config]}`, ephemeral: true })
						.catch(err => log(err, "error"));
				}
			} else {
				interaction
					.reply({ content: "Unknown config.", ephemeral: command.shouldBeEphemeral(interaction) })
					.catch(console.error.bind(console));
			}
		} else {
			// List config entries.
			interaction
				.reply({
					embeds: [
						new MessageEmbed({
							title: "Config",
							fields: Object.entries(config).map(([name, value]) => ({
								name,
								value: value as string,
								inline: true,
							})),
						}),
					],
				})
				.catch(err => log(err, "error"));
		}
	},
};

export default command;
