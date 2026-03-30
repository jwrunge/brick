import { mkdir, stat } from "node:fs/promises";
import path from "node:path";

export const ensurePaths = async (relativeDir: string, output: string) => {
	const dist = path.resolve(relativeDir, "dist");
	const distOutput = path.resolve(dist, output);

	for (const dir of [dist, distOutput]) {
		try {
			await stat(dir);
		} catch {
			await mkdir(dir, { recursive: true });
		}
	}

	return {
		dist,
		distOutput,
	};
};
