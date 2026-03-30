export type Variable = {
	type: string;
	default: string | number | boolean | null;
	const: boolean;
	sync: boolean;
	optional: boolean;
};

const scalarTypes = ["boolean", "int", "float", "string", "object"] as const;

export type ScalarType = (typeof scalarTypes)[number];
export type Types = ScalarType | `${ScalarType}[]` | "null" | "Content";

export const types: readonly Types[] = [
	...scalarTypes.flatMap((type) => [type, `${type}[]` as const]),
	"null",
	"Content",
];
