import { MessageEmbed } from "discord.js";
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
		},
		{
			type: "STRING",
			name: "src",
			description: "Source to compile.",
		},
	],
	hasPermission: () => true,
	parseArguments: content => /\s*(\S+)\s*([\s\S]*)/g.exec(content)?.splice(1) ?? [],
	handler: (_, message, compiler, code) => {
		fromString({ compiler, code, save: false })
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

				message.reply(embed).catch(console.error.bind(console));
			})
			.catch(err => {
				message.reply(err, { disableMentions: "all" }).catch(console.error.bind(console));
			});
	},
};

export default command;
