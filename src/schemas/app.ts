export interface AppSchema {
	$schema?: string;
	name: string;
	version: `${number}.${number}.${number}`;
	environment?: "dev" | "staging" | "prod";
	features?: {
		analytics?: boolean;
		auth?: boolean;
	};
	endpoints: Array<{
		id: string;
		method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
		path: `/${string}`;
		timeoutMs?: number;
	}>;
}
