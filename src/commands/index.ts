import type { Command } from "../types/command";
import cmdhistory from "./cmdhistory";
import compile from "./compile";
import compilers from "./compilers";
import config from "./config";
import debug from "./debug";
import github from "./github";
import history from "./history";
import note from "./note";
import permissions from "./permissions";
import ping from "./ping";
import purge from "./purge";
import report from "./report";
import serverinfo from "./serverinfo";
import update from "./update";
import uptime from "./uptime";
import warn from "./warn";

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
	serverinfo,
	update,
	uptime,
	warn,
	note,
	history,
	purge,
};

export function getCommand(commandName: string): Command | undefined {
	return commands[commandName.toLowerCase() as never];
}

export function getCommands(): Command[] {
	// TODO: return a readonly Command[] and cache it?
	return Object.values(commands);
}
