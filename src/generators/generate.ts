import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppSchema } from "../schemas/app.ts";
import generateWeb from "./web.ts";

export type OutputType =
	| "web"
	| "ios"
	| "android"
	| "macos"
	| "windows"
	| "linux";

export const generate = async (output: OutputType, dir: string) => {
	const relativeDir = path.resolve(dir);
	const appFilePromise = readFile(path.resolve(relativeDir, "app.json"));
	let appSchema: AppSchema;

	try {
		const [appFile] = await Promise.all([appFilePromise]);
		appSchema = JSON.parse(appFile.toString()) as AppSchema;
	} catch (err) {
		console.error(`Error reading app.json in ${dir}:`, err);
		process.exit(1);
	}

	switch (output) {
		case "web":
			generateWeb(relativeDir, appSchema);
			break;
		default:
			console.error(`Output type ${output} not supported.`);
			process.exit(1);
	}
};
