import type { GuildMember } from "discord.js";
import type { Command } from "../command";
import { log } from "../logger";
import { getState } from "../store/state";

const command: Command = {
	name: "debug",
	description: "Test logger.",
	options: [],
	hasPermission: interaction =>
		(interaction.member as GuildMember).roles.cache.has(getState().config.developerRoleId),
	shouldBeEphemeral: interaction => interaction.channelID !== getState().config.botChannelId,
	handler: interaction => {
		interaction
			.reply({
				content: "This command helps with intentional debug testing.",
				ephemeral: command.shouldBeEphemeral(interaction),
			})
			.then(() => {
				log("This is an info message.", "info");
				log("This is an warn message.", "warn");
				log("This is an error message.", "error");
				log("This is an debug message.", "debug");
				throw new Error("This is intended error that has been thrown.");
			})
			.catch(err => log(err, "error"));
	},
};

export default command;
