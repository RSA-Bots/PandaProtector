import type { ApplicationCommandOptionData, CommandInteraction, CommandInteractionOption } from "discord.js";
import type { DotEnv } from "./dotEnv";
import type { State } from "./state";

export interface Command {
	readonly name: string;
	readonly description: string;
	readonly options: ApplicationCommandOptionData[];
	readonly hasPermission: (state: State, interaction: CommandInteraction) => boolean;
	readonly shouldBeEphemeral: (state: State, interaction: CommandInteraction) => boolean;
	readonly handler: (
		state: State,
		interaction: CommandInteraction,
		args: CommandInteractionOption[],
		env?: DotEnv
	) => void;
}
