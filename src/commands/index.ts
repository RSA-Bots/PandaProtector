import type { Command } from "../types/command";
import cmdhistory from "./cmdhistory";
import compile from "./compile";
import compilers from "./compilers";
import config from "./config";
import debug from "./debug";
import github from "./github";
import permissions from "./permissions";
import ping from "./ping";
import report from "./report";
import role from "./role";
import serverinfo from "./serverinfo";
import update from "./update";
import uptime from "./uptime";

/** Keep commands in lowercase. */
const commands = {
	cmdhistory,
	compile,
	compilers,
	config,
	debug,
	github,
	permissions,
	ping,
	report,
	role,
	serverinfo,
	update,
	uptime,
};

export function getCommand(commandName: string): Command | undefined {
	return commands[commandName.toLowerCase() as never];
}

export function getCommands(): Command[] {
	// TODO: return a readonly Command[] and cache it?
	return Object.values(commands);
}
