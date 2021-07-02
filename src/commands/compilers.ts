import { MessageEmbed } from "discord.js";
import { getCompilers } from "wandbox-api-updated";
import type { Command } from "../command";
import { getState } from "../store/state";

const command: Command = {
	name: "compilers",
	description: "Gets a list of supported compilers for the specified language.",
	options: [
		{
			type: "STRING",
			name: "language",
			description: "List of compilers for the specified language.",
			required: true,
			choices: [
				{
					name: "C#",
					value: "c#",
				},
				{
					name: "C++",
					value: "c++",
				},
				{
					name: "Java",
					value: "java",
				},
				{
					name: "JavaScript",
					value: "javascript",
				},
				{
					name: "Lua",
					value: "lua",
				},
				{
					name: "Python",
					value: "python",
				},
				{
					name: "TypeScript",
					value: "typescript",
				},
			],
		},
	],
	hasPermission: () => true,
	shouldBeEphemeral: interaction => interaction.channelID !== getState().config.botChannelId,
	handler: (interaction, args) => {
		const language = args.get("language")?.value as string;

		getCompilers(language)
			.then(list => {
				const listEmbed = new MessageEmbed({
					timestamp: interaction.createdTimestamp,
					color: "#FF000A",
				});

				list.forEach(compiler => {
					listEmbed.addField(`${language} ${compiler.version}`, `Compiler: ${compiler.name}`, true);
				});

				// Discord embeds do not allow for more than 25 fields.
				listEmbed.fields.splice(25);

				interaction.reply({ embeds: [listEmbed] }).catch(console.error.bind(console));
			})
			.catch(err => {
				interaction.reply({ content: err as string, allowedMentions: {} }).catch(console.error.bind(console));
			});
	},
};

export default command;
