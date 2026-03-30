import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AppSchema } from "../schemas/app.ts";
import { ensurePaths } from "./util.ts";

const defaultHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{%APP.name%}</title>
  </head>
  <body>
    {%CONTENT%}
  </body>
</html>`;

export default async (relativeDir: string, appSchema: AppSchema) => {
	console.info(`Generating web project ${relativeDir}`);

	const { distOutput } = await ensurePaths(relativeDir, "web");
	const indexHtmlPath = path.resolve(relativeDir, "index.html");

	let indexHtml: string | null = null;
	try {
		indexHtml = await readFile(indexHtmlPath, "utf-8");
	} catch {
		console.warn(
			`No index.html found at ${indexHtmlPath}, generating default index.html`,
		);
	}

	const htmlContent = (indexHtml || defaultHtml)
		.replace(/{%APP.name%}/g, appSchema.name)
		.replace(
			/{%CONTENT%}/g,
			`<h1>${appSchema.name}</h1><p>Version: ${appSchema.version} (build ${appSchema.build})</p>`,
		);
	await writeFile(path.resolve(distOutput, "index.html"), htmlContent);
};
