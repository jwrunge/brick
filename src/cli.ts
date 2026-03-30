import { readFileSync } from "node:fs";
import parse from "./contracts/parse.ts";
import { generate, type OutputType } from "./generate.ts";

type CliMode = "generate" | "parse";

const args = process.argv.slice(2) as [CliMode] | [];
const [mode] = args;

const usageError = () => {
	console.error("Usage: cli <mode> [options]");
	process.exit(1);
};

switch (mode) {
	case "generate": {
		const [output, dir] = args.slice(1) as [OutputType, string];
		if (!output || !dir) usageError();
		generate(output, dir);
		break;
	}
	case "parse": {
		const [file] = args.slice(1) as [string];
		if (!file) usageError();

		const contents = await readFileSync(file, "utf-8");

		parse(contents);
		break;
	}
	default:
		usageError();
}
