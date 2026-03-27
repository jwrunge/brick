import { execFile } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const root = process.cwd();
const srcRoot = path.resolve(root, "src/schemas");
const outRoot = path.resolve(root, "schemas");

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
const findSchemaSources = async (dir) => {
	const entries = await readdir(dir, { withFileTypes: true });
	/** @type {string[][]} */
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.resolve(dir, entry.name);
			if (entry.isDirectory()) {
				return findSchemaSources(fullPath);
			}
			if (
				entry.isFile() &&
				entry.name.endsWith(".ts") &&
				!entry.name.endsWith(".d.ts")
			) {
				return [fullPath];
			}
			return [];
		}),
	);
	return files.flat();
};

/**
 * @param {string} sourcePath
 * @returns {string}
 */
const outPathFor = (sourcePath) => {
	const relative = path.relative(srcRoot, sourcePath);
	const ext = path.extname(relative);
	const withoutExt = relative.slice(0, -ext.length);
	return path.resolve(outRoot, `${withoutExt}.schema.json`);
};

/**
 * @param {string} sourcePath
 * @returns {Promise<string>}
 */
const generateSchema = async (sourcePath) => {
	const outPath = outPathFor(sourcePath);
	await mkdir(path.dirname(outPath), { recursive: true });

	await execFileAsync("npx", [
		"ts-json-schema-generator",
		"--path",
		sourcePath,
		"--type",
		"*",
		"--expose",
		"export",
		"--jsDoc",
		"extended",
		"--out",
		outPath,
	]);

	return outPath;
};

const run = async () => {
	try {
		await rm(outRoot, { recursive: true, force: true });
		await mkdir(outRoot, { recursive: true });

		const sources = await findSchemaSources(srcRoot);
		if (sources.length === 0) {
			console.log("No schema source files found in src/schemas.");
			return;
		}

		const outputs = [];
		for (const source of sources) {
			const output = await generateSchema(source);
			outputs.push({ source, output });
		}

		for (const item of outputs) {
			console.log(
				`Generated ${path.relative(root, item.output)} from ${path.relative(root, item.source)}`,
			);
		}
	} catch (error) {
		const code =
			error && typeof error === "object" && "code" in error
				? String(error.code)
				: undefined;
		if (code === "ENOENT") {
			console.log("No src/schemas directory found. Nothing to generate.");
			return;
		}
		console.error(
			"Schema generation failed:",
			error instanceof Error ? error.message : error,
		);
		process.exit(1);
	}
};

run();
