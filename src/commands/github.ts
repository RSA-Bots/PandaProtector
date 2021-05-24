import { GuildMember, MessageEmbed } from "discord.js";
import fetch from "node-fetch";
import type { Command } from "../command";
import type { Config } from "../config";
import type { DotEnv } from "../dotEnv";
import type { Branch, Commit, GithubUser, Issue, PullRequest, Repository } from "../structures/github";

const command: Command = {
	name: "github",
	description: "Helper command for retrieving data for the guild specified repository.",
	options: [
		{
			type: "STRING",
			name: "name",
			description: "The type of item to fetch (branch, commit, issue, pullrequest)",
			required: true,
		},
		{
			type: "STRING",
			name: "query",
			description: "The query to fetch. (REF for commits, pull-request number, etc)",
			required: true,
		},
		{
			type: "STRING",
			name: "repo",
			description: "A custom repository to fetch data from",
		},
	],
	hasPermission: (state, interaction) =>
		(interaction.member as GuildMember).roles.cache.has(state.config.developerRoleId),
	shouldBeEphemeral: (state, interaction) => interaction.channelID !== state.config.botChannelId,
	handler: (state, interaction, args, env) => {
		interaction.defer(command.shouldBeEphemeral(state, interaction)).catch(console.error.bind(console));

		const repo = args[2] ? (args[2].value as string) : state.config.ghRepoPath;
		const objectType = (args[0].value as string).toLowerCase();
		const query = args[1].value as string;

		const embedReply = new MessageEmbed();

		switch (objectType) {
			case "branch":
			case "branches": {
				oauthFetch(`https://api.github.com/repos/${repo}/branches/${query}`, env)
					.then(json => {
						const jsonData = json as Branch;

						embedReply.setTitle(`${jsonData.name} in ${repo}`);
						embedReply.setThumbnail(jsonData.commit.author.avatar_url);
						embedReply.setURL(jsonData._links.html);

						embedReply.addField("Branch Name", `[${jsonData.name}](${jsonData._links.self})`, true);
						embedReply.addField(
							"Latest Commit",
							`[${jsonData.commit.sha.slice(0, 7)}](${jsonData.commit.url})`,
							true
						);
						embedReply.addField(
							"Latest Commit Author",
							generateGitHubUserLink(jsonData.commit.author),
							true
						);

						interaction.editReply(embedReply).catch(console.error.bind(console));
					})
					.catch(res => {
						interaction
							.editReply(`Failed to handle request. (${res as string})`)
							.catch(console.error.bind(console));
						return;
					});

				break;
			}
			case "commit": {
				oauthFetch(`https://api.github.com/repos/${repo}/commits/${query}`, env)
					.then(json => {
						const jsonData = json as Commit;
						embedReply.setTitle(`commit: ${jsonData.sha}`);
						embedReply.setURL(jsonData.html_url);
						embedReply.setThumbnail(jsonData.author.avatar_url);

						embedReply.addField("Author", generateGitHubUserLink(jsonData.author), true);
						embedReply.addField(
							"Stats",
							`Total: ${jsonData.stats.total}\nAdditions: ${jsonData.stats.additions}\nDeletions: ${jsonData.stats.deletions}`,
							true
						);

						embedReply.addField("Signed", jsonData.commit.verification.verified, true);
						embedReply.addField("Message", jsonData.commit.message, false);

						const fileLength = jsonData.files.length;
						let longestLength = 0;
						let longestChange = 1;

						jsonData.files.forEach(file => {
							const fileNameLength = file.filename.length;
							if (fileNameLength > longestLength) longestLength = fileNameLength;
							if (file.additions >= 10 && longestChange == 1) longestChange = 2;
						});

						if (fileLength > 0) {
							let count = 0;
							let toAdd = "```";

							jsonData.files.forEach(file => {
								if (count <= 5) {
									count += 1;
									const spacing = longestLength - file.filename.length;
									const pipe = longestChange - (file.additions >= 10 ? 1 : 0);
									toAdd = `${toAdd}\n[${file.status.slice(0, 1).toUpperCase()}]${
										file.filename
									}: ${" ".repeat(spacing)} +${file.additions}${" ".repeat(pipe)}| -${
										file.deletions
									}`;
								}
							});

							if (fileLength - count > 0) toAdd = `${toAdd}\n...and ${fileLength - count} more.`;

							embedReply.addField("Files", `${toAdd}\n\`\`\``, false);
						}

						interaction.editReply(embedReply).catch(console.error.bind(console));
					})
					.catch(res => {
						interaction
							.editReply(`Failed to handle request. (${res as string})`)
							.catch(console.error.bind(console));
						return;
					});

				break;
			}
			case "issue": {
				oauthFetch(`https://api.github.com/repos/${repo}/issues/${query}`, env)
					.then(json => {
						const modifiedEmbed = handleIssueOrPr(state.config, json as Issue, embedReply);

						interaction.editReply(modifiedEmbed).catch(console.error.bind(console));
					})
					.catch(res => {
						interaction
							.editReply(`Failed to handle request. (${res as string})`)
							.catch(console.error.bind(console));
						return;
					});

				break;
			}
			case "pull-request":
			case "pullrequest":
			case "pull request":
			case "pr": {
				oauthFetch(`https://api.github.com/repos/${repo}/pulls/${query}`, env)
					.then(json => {
						const jsonData = json as PullRequest;
						const modifiedEmbed = handleIssueOrPr(state.config, jsonData, embedReply);

						modifiedEmbed.addField("Merged", jsonData.merged, true);
						if (!jsonData.merged) {
							modifiedEmbed.addField("Mergeable", jsonData.mergeable, true);
						} else {
							modifiedEmbed.addField("Merged at", jsonData.merged_at, true);
							modifiedEmbed.addField("Merged by", generateGitHubUserLink(jsonData.merged_by), true);
						}

						interaction.editReply(modifiedEmbed).catch(console.error.bind(console));
					})
					.catch(res => {
						interaction
							.editReply(`Failed to handle request. (${res as string})`)
							.catch(console.error.bind(console));
						return;
					});

				break;
			}
			case "repo":
			case "repository":
				oauthFetch(`https://api.github.com/repos/${query}`, env)
					.then(json => {
						const jsonData = json as Repository;
						const embedReply = new MessageEmbed();

						embedReply.setTitle(jsonData.name);
						embedReply.setDescription(jsonData.full_name);
						embedReply.setURL(jsonData.html_url);
						embedReply.setThumbnail(jsonData.owner.avatar_url);

						embedReply.addField("Owner", generateGitHubUserLink(jsonData.owner), true);
						embedReply.addField("Language", jsonData.language, true);
						embedReply.addField("Creation Date", jsonData.created_at, true);
						embedReply.addField("Is a fork", jsonData.fork, true);
						embedReply.addField("Open Issues", jsonData.open_issues_count, true);
						embedReply.addField("Watchers", jsonData.watchers_count, true);

						embedReply.addField(
							"Description",
							jsonData.description ? jsonData.description : "No description set."
						);

						interaction.editReply(embedReply).catch(console.error.bind(console));
					})
					.catch(res => {
						interaction
							.editReply(`Failed to handle request. (${res as string})`)
							.catch(console.error.bind(console));
						return;
					});

				break;
			default:
				interaction
					.editReply(
						"Invalid object type provided. Valid Types: Branch, Commit, Issue, Pull-Request, Repository"
					)
					.catch(console.error.bind(console));
				break;
		}
	},
};

export default command;

function handleIssueOrPr(config: Config, jsonData: Issue | PullRequest, embedReply: MessageEmbed): MessageEmbed {
	embedReply.setTitle(`[${jsonData.state}] #${jsonData.number} ${jsonData.title}`);
	if (jsonData.labels.length > 0) {
		const labelList = [] as string[];

		jsonData.labels.map(label => labelList.push(label.name));

		embedReply.setDescription(labelList.join(", "));
	}
	embedReply.setThumbnail(jsonData.user.avatar_url);
	embedReply.setURL(jsonData.html_url);

	embedReply.addField("Author", generateGitHubUserLink(jsonData.user), true);
	embedReply.addField("Association", jsonData.author_association, true);
	if (jsonData.assignees?.length > 0) {
		const assignees = [] as string[];

		jsonData.assignees.map(assignee => assignees.push(generateGitHubUserLink(assignee)));

		embedReply.addField("Assignees", assignees.join("\n"), true);
	}

	embedReply.addField("Body", hyperlinkComments(config, jsonData.body), false);

	return embedReply;
}

function hyperlinkComments(config: Config, body: string): string {
	const newBody = body.replace(/(\(\S{7}\))+/g, match => {
		return `[${match}](https://github.com/${config.ghRepoPath}/commit/${match.slice(1, match.length - 1)})`;
	});

	return `${newBody.slice(0, 800)}${newBody.length > 800 ? "\n...and more!" : ""}`;
}

function generateGitHubUserLink(user: GithubUser): string {
	return `[${user.login}](${user.html_url})`;
}

function oauthFetch(url: string, env?: DotEnv): Promise<unknown> {
	return new Promise((resolve, reject) => {
		fetch(url, {
			headers: {
				Authorization: `token ${env?.ghOauth ? env.ghOauth : ""}`,
			},
		})
			.then(res => res.json())
			.then(json => {
				const res = json as { message: string; documentation_url: string };

				if (res.message) {
					if (res.message.includes("rate limit")) {
						reject(
							env?.ghOauth
								? "Ratelimit reached!"
								: "[No Oauth] Ratelimit reached! If you are seeing this error, ask the bot host to set the `ghOauth` field within the `.env` file."
						);
					} else {
						reject(res.message);
					}
				} else {
					resolve(json);
				}
			})
			.catch(console.error.bind(console));
	});
}