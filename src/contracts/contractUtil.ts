export type Variable = {
	type: string;
	default: string | number | boolean | null;
	const: boolean;
	sync: boolean;
};

export const types = ["boolean", "int", "float", "null", "string"] as const;
export type Types = (typeof types)[number];
