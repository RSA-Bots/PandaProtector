import type { Snowflake } from "discord-api-types";
import { MessageEmbed } from "discord.js";
import type { Command } from "../command";
import { getState } from "../store/state";

const command: Command = {
	name: "report",
	description: "Report a user to staff.",
	options: [
		{
			type: "USER",
			name: "user",
			description: "The user to report.",
			required: true,
		},
		{
			type: "STRING",
			name: "reason",
			description: "The reason for the report.",
			required: true,
		},
	],
	hasPermission: () => true,
	shouldBeEphemeral: () => true,
	handler: (interaction, args) => {
		const reasonText = args.get("reason")?.value as string;
		const state = getState();
		const userObject = state.client.users.cache.get(args.get("user")?.value as Snowflake);
		const reportChannel = state.client.channels.cache.get(state.config.reportChannelId);

		if (!reportChannel?.isText()) {
			// Ensure the report channel is a text channel.
			console.error("Report channel does not exist or is not a text channel.");
			return;
		}

		if (!userObject || userObject.bot || userObject.id === interaction.user.id) {
			// Ensure the target user is reportable and not the reporter.
			interaction
				.reply({ content: "Could not report this user.", ephemeral: command.shouldBeEphemeral(interaction) })
				.catch(console.error.bind(console));
			return;
		}

		if (!interaction.channel?.isText()) {
			// Ensure the interaction channel is a text channel.
			return;
		}

		interaction.channel
			.send("Reporting...")
			.then(message => {
				reportChannel
					.send({
						embeds: [
							new MessageEmbed({
								fields: [
									{
										name: "Reporter",
										value: `<@${interaction.user.id}>`,
										inline: true,
									},
									{
										name: "Accused",
										value: `<@${userObject.id}>`,
										inline: true,
									},
									{
										name: "Jump Link",
										value: `[Here](${message.url})`,
										inline: true,
									},
									{
										name: "Reason",
										value: reasonText,
									},
								],
								timestamp: interaction.createdTimestamp,
								color: "#FF0000",
							}),
						],
					})
					.then(reportMessage => {
						message.edit("Reported.").catch(console.error.bind(console));
						interaction
							.reply({
								content: `You have reported the user.`,
								ephemeral: command.shouldBeEphemeral(interaction),
							})
							.catch(console.error.bind(console));
						reportMessage.react("👀").catch(console.error.bind(console));
						reportMessage.react("✅").catch(console.error.bind(console));
						reportMessage.react("❌").catch(console.error.bind(console));
					})
					.catch(reason => {
						console.error(`Reporting ${userObject.username} with reason ${reasonText} failed (embed).`);
						console.error(reason);

						// If the embed fails to send, remove the jump link message.
						message.delete().catch(console.error.bind(console));
						interaction
							.reply({
								content: `Could not report the user, please mention an online mod.`,
								ephemeral: command.shouldBeEphemeral(interaction),
							})
							.catch(console.error.bind(console));
					});
			})
			.catch(reason => {
				console.error(`Reporting ${userObject.username} with reason ${reasonText} failed (initial message).`);
				console.error(reason);

				interaction
					.reply({
						content: `Could not report the user, please mention an online mod.`,
						ephemeral: command.shouldBeEphemeral(interaction),
					})
					.catch(console.error.bind(console));
			});
	},
};

export default command;
