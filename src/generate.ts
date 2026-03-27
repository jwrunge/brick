import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
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

	try {
		const [_appFile] = await Promise.all([appFilePromise]);
	} catch (err) {
		console.error(`Error reading app.json in ${dir}:`, err);
		process.exit(1);
	}

	const dist = path.resolve(relativeDir, "dist");
	const distOutput = path.resolve(dist, output);

	for (const dir of [dist, distOutput]) {
		try {
			await stat(dir);
		} catch {
			await mkdir(dir, { recursive: true });
		}
	}

	if (output === "web") {
		console.log(`Generating web project in ${dir}`);
		writeFile(
			path.resolve(distOutput, "index.html"),
			"<!DOCTYPE html><html><head><title>Brick App</title></head><body><h1>Hello, Brick!</h1></body></html>",
		);
	}
};
