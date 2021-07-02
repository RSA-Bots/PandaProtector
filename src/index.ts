import { Client, Intents, TextChannel } from "discord.js";
import exitHook from "exit-hook";
import { readFileSync } from "fs";
import { connect, connection, disconnect } from "mongoose";
import { getCommand, getCommands } from "./commands";
import { Config, isConfig } from "./config";
import { canUpdateVerbosity, log } from "./logger";
import commandLogModel from "./models/commandLog.model";
import { isSecrets, Secrets } from "./secrets";
import type { State } from "./state";
import { setOauth } from "./store/githubOauth";
import { setState } from "./store/state";

// USAGE: npm start [configPath] [secretsPath]
const configPath = process.argv[2] ?? "config.json";
const secretsPath = process.argv[3] ?? "secrets.json";

function deploySlashCommands(client: Client, config: Config) {
	log("Deploying slash commands", "info");
	const commands = client.guilds.cache.get(config.guildId)?.commands;

	if (!commands) {
		log('Could not deploy slash-commands. Can retry with "!deploy".', "warn");
		return Promise.reject("Could not deploy slash-commands.");
	}

	return Promise.all(
		getCommands().map(command => {
			commands
				.create({
					name: command.name,
					description: command.description,
					options: command.options,
				})
				.then(slash => {
					log(`Loaded ${slash.name} with id: ${slash.id}.`, "debug");
				})
				.catch(err => log(err, "error"));
		})
	);
}

function main(state: State, secrets: Secrets) {
	const { config, client } = state;

	setState(state);

	if (!canUpdateVerbosity(config.verbosityLevel)) {
		// TODO: a more scalable approach to sanity checking config.
		config.verbosityLevel = "all";
		log("Invalid verbosity level, using all instead.", "warn");
	}

	client.on("ready", () => {
		client.user?.setActivity(state.version, { type: "PLAYING" });
		log("Client logged in.", "info");
		log(`Client Version: ${state.version}`, "debug");
		deploySlashCommands(client, config).catch(console.error.bind(console));
	});

	client.on("interaction", interaction => {
		if (!interaction.isCommand()) return;
		const command = getCommand(interaction.commandName);

		if (command && command.hasPermission(interaction)) {
			commandLogModel
				.create({
					discordId: interaction.user.id,
					command: command.name,
					arguments: interaction.options.map(value => String(value.value)),
				})
				.catch(console.error.bind(console));

			command.handler(interaction, interaction.options);
		}
	});

	client.on("message", message => {
		if (message.author.bot) {
			// Do not process bot messages.
			return;
		}

		if (message.channel.id === config.showcaseChannelId) {
			// Handle showcase.
			if (message.attachments.size === 0 && !/https?:\/\//.test(message.content)) {
				// Ensure messages in showcase contain an attachment or link.
				if (!message.member?.roles.cache.has(config.staffRoleId)) {
					message.delete().catch(console.error.bind(console));
					return; // Do not do any further processing.
				}
			} else {
				// Add up vote and down vote reaction to message.
				// TODO: make emotes configurable in the future?
				message.react("👍").catch(console.error.bind(console));
				message.react("👎").catch(console.error.bind(console));
			}
		}

		// Handle meta commands.
		if (message.member?.roles.cache.has(state.config.developerRoleId)) {
			if (message.content.toLowerCase() === "!deploy") {
				deploySlashCommands(client, config)
					.then(() => message.reply("Successfully loaded slash-commands."))
					.catch(console.error.bind(console));
			} else if (message.content.toLowerCase() === "!unload") {
				client.guilds.cache
					.get(config.guildId)
					?.commands.set([])
					.then(() => message.reply("Successfully unloaded slash-commands."))
					.catch(console.error.bind(console));
			} else if (message.content.toLowerCase() === "!unload-global") {
				client.application?.commands
					.set([])
					.then(() =>
						message.reply(
							"Global slash-commands successfully unloaded. Please give approx 1 hour for changes to take effect."
						)
					)
					.catch(console.error.bind(console));
			}
		}

		//Handle QA
		if (message.channel.id === config.qaChannelId) {
			const original = message.content;
			if (original.includes("title:") && original.includes("body:")) {
				const content = /(.*)\n(.*)/g.exec(message.content)?.splice(1, 3);
				if (content === undefined) return;
				(message.channel as TextChannel).threads
					.create({
						name: content[0].substr(6),
						autoArchiveDuration: 60,
						reason: "Auto-generated QA channel",
					})
					.then(thread => {
						thread
							.send({ content: `Thread started by ${message.member?.displayName}` })
							.catch(err => log(err as string, "warn"));
						thread
							.send({ content: content[1].substr(5) })
							.then(() => {
								thread.members.add(message.author).catch(err => log(err as string, "warn"));
							})
							.catch(err => log(err as string, "warn"));
					})
					.catch(err => log(err as string, "error"));
			} else {
				console.log(original.includes("title:"));
				console.log(original.includes("body:"));
			}
			message.delete().catch(err => log(err as string, "warn"));
		}
	});

	client.on("guildMemberUpdate", member => {
		if (member.pending) {
			member.roles.add(config.memberRoleId).catch(console.error.bind(console));
		}
	});

	// Connect to the database.
	connect(secrets.dbUri, {
		ssl: true,
		useCreateIndex: true,
		useFindAndModify: false,
		useNewUrlParser: true,
		useUnifiedTopology: true,
	}).catch(reason => log(`Could not connect to the database: ${String(reason)}`, "error"));

	connection.on("error", reason => {
		log(String(reason), "error");
	});

	// Cleanup resources on exit.
	exitHook(() => {
		client.guilds.cache.get(config.guildId)?.commands.set([]).catch(console.error.bind(console));
		disconnect().catch(console.error.bind(console));
	});
}

try {
	const config = JSON.parse(readFileSync(configPath, "utf-8")) as unknown;
	const secrets = JSON.parse(readFileSync(secretsPath, "utf-8")) as unknown;
	const version = (JSON.parse(readFileSync("package.json", "utf-8")) as { version: string })["version"];

	if (!isConfig(config)) {
		// Potentially replace missing fields with defaults instead of erroring out?
		throw new Error("Config file does not match the Config interface.");
	}

	if (!isSecrets(secrets)) {
		throw new Error("Secrets file does not match the Secrets interface.");
	}

	const client = new Client({
		intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
	});

	if (secrets.ghOauth !== "") {
		setOauth(secrets.ghOauth);
	}

	// Connect to Discord.
	client
		.login(secrets.token)
		.then(() => main({ version, config, client, configPath }, secrets))
		.catch(console.error.bind(console));
} catch (e) {
	console.error(e);
}
