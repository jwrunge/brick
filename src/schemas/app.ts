export interface AppSchema {
	$schema?: string;
	name: string;
	version: `${number}.${number}.${number}`;
	build: number;
	root: string;
}
