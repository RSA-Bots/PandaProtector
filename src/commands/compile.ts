import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import { fromString } from "wandbox-api-updated";
import type { Command } from "../command";

const command: Command = {
	name: "compile",
	description: "Execute code from Discord, see the *compilers* command to determine which compilers are available.",
	options: [
		{
			type: "STRING",
			name: "compiler",
			description: "Compiler to use.",
			required: true,
		},
		{
			type: "STRING",
			name: "src",
			description: "Source to compile. Can also use the last message sent by you.",
		},
	],
	hasPermission: () => true,
	shouldBeEphemeral: (state, interaction) => interaction.channelID !== state.config.botChannelId,
	handler: (state, interaction, args) => {
		let codeParse = "";
		let missingSource = false;

		if (!args[1]) {
			const { lastMessageID, lastMessageChannelID } = interaction.member as GuildMember;

			if (lastMessageChannelID && lastMessageID) {
				const message = (
					interaction.guild?.channels.resolve(lastMessageChannelID) as TextChannel
				).messages.resolve(lastMessageID);

				if (message) {
					codeParse = message.content;
					if (lastMessageChannelID !== state.config.botChannelId) {
						message.delete().catch(console.error.bind(console));
					}
				} else {
					missingSource = true;
				}
			} else {
				missingSource = true;
			}
		} else {
			codeParse = args[1].value as string;
		}

		if (missingSource) {
			interaction
				.reply("Failed to parse previous message, did you send one?", {
					ephemeral: command.shouldBeEphemeral(state, interaction),
				})
				.catch(console.error.bind(console));
			return;
		}

		const code = /((```\S*)|`)?([\s\S]*?)`*$/g.exec(codeParse)?.splice(3).join(" ") ?? "";
		interaction
			.defer(command.shouldBeEphemeral(state, interaction))
			.then(() =>
				fromString({
					compiler: args[0].value as string,
					code: code,
					save: false,
				})
			)
			.then(result => {
				const embed = new MessageEmbed();

				if (result.compiler_error || result.program_error) {
					embed.setColor("#D95B18");
					embed.setDescription("Compilation failed: errors present.");
					embed.addField(
						"Errors",
						`\`\`\`\n${(result.compiler_error ?? result.program_error)
							.slice(0, 1000)
							.replace(/```/g, "")}\`\`\``,
						false
					);
				} else {
					embed.setColor("#24BF2F");
					embed.setDescription("Compilation finished.");
					embed.addField(
						"Program Message",
						`\`\`\`\n${result.program_message.slice(0, 1000).replace(/```/g, "")}\`\`\``,
						false
					);
				}

				interaction.editReply(embed).catch(console.error.bind(console));
			})
			.catch(err => {
				interaction.editReply(err, { allowedMentions: {} }).catch(console.error.bind(console));
			});
	},
};

export default command;
