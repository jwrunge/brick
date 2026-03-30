import { rxComments } from "../util.ts";
import { types, type Variable } from "./contractUtil.ts";

const rxContractContent = /(?:^|\n)\[Contract\]\s*([\s\S]*?)(?=\n\[|$)/;
const rxValidVariableName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const rxValidConst = /^[A-Z_]+$/;
const rxArrayBrackets = /\[\s*\]\s*$/;

const variableInitializers = ["let", "syn", "const"];
const rxDeclaration =
	/^(let|syn|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*\??)\s*(?::\s*([\s\S]*?))?\s*(?:=\s*([\s\S]*))?$/;

const isKnownType = (type: string) =>
	types.includes(type as (typeof types)[number]);

const validateStructuredType = (value: unknown, path: string) => {
	if (typeof value === "string") {
		if (!isKnownType(value)) {
			throw new Error(
				`Invalid type annotation for property '${path}': ${value}`,
			);
		}
		return;
	}

	if (Array.isArray(value)) {
		if (value.length !== 1) {
			throw new Error(
				`Array type annotation for property '${path}' must have exactly one item schema`,
			);
		}
		validateStructuredType(value[0], `${path}[]`);
		return;
	}

	if (value && typeof value === "object") {
		for (const [childKey, childValue] of Object.entries(value)) {
			validateStructuredType(childValue, `${path}.${childKey}`);
		}
		return;
	}

	throw new Error(
		`Type annotation for property '${path}' must be a string, object, or single-schema array`,
	);
};

const determineTypeFromValue = (
	value: string,
): {
	varType: string;
	// biome-ignore lint/suspicious/noExplicitAny: we need to keep loose
	value: any;
} => {
	const trimmed = value.trim();

	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		return { varType: "object", value: value };
	}

	if (value === "true" || value === "false") {
		return { varType: "boolean", value: value === "true" };
	} else if (!Number.isNaN(Number(value))) {
		const numValue = Number(value);
		if (Number.isInteger(numValue)) {
			return { varType: "int", value: numValue };
		} else {
			return { varType: "float", value: numValue };
		}
	} else if (value === "null") {
		return { varType: "null", value: null };
	} else {
		return { varType: "string", value };
	}
};

const validateTypeAnnotation = (type: string): string => {
	if (type.trim().startsWith("{")) {
		let jsonType: unknown;
		try {
			jsonType = JSON.parse(type.replace(rxArrayBrackets, ""));
		} catch {
			throw new Error(`Invalid object type annotation JSON: ${type}`);
		}

		validateStructuredType(jsonType, "$root");
		return type;
	}
	if (isKnownType(type)) {
		return type as string;
	}
	throw new Error(`Invalid type annotation: ${type}`);
};

const getBraceDelta = (line: string) => {
	const opens = (line.match(/\{/g) ?? []).length;
	const closes = (line.match(/\}/g) ?? []).length;
	return opens - closes;
};

const collectContractDeclarations = (contractString: string) => {
	const declarations: string[] = [];
	let current = "";
	let braceDepth = 0;

	for (const rawLine of contractString.split("\n")) {
		const line = rawLine.trim();
		if (!line) continue;

		if (!current) {
			current = line;
		} else {
			current = `${current} ${line}`;
		}

		braceDepth += getBraceDelta(rawLine);

		if (braceDepth <= 0) {
			declarations.push(current.trim());
			current = "";
			braceDepth = 0;
		}
	}

	if (current) {
		throw new Error(
			`Unterminated object type/default in declaration: ${current}`,
		);
	}

	return declarations;
};

export default (markup: string) => {
	const contractString = markup
		.match(rxContractContent)?.[1]
		?.replace(rxComments, "")
		?.trim();

	const variables: Record<string, Variable> = {};
	const declarations = contractString
		? collectContractDeclarations(contractString)
		: [];

	for (const line of declarations) {
		const match = line.match(rxDeclaration);
		if (!match) {
			throw new Error(`Invalid variable declaration: ${line}`);
		}

		const initializer = match[1];
		if (!variableInitializers.includes(initializer)) {
			throw new Error(`Invalid variable declaration: ${line}`);
		}

		// Get variable name
		const nameToken = match[2];
		const name = nameToken.replace(/\?$/, "").trim();
		const isOptional = nameToken.endsWith("?");

		if (!name) {
			throw new Error(`Variable name missing in line: ${line}`);
		}

		if (!rxValidVariableName.test(name)) {
			throw new Error(`Invalid variable name '${name}' in line: ${line}`);
		}

		if (initializer === "const" && !rxValidConst.test(name)) {
			throw new Error(`Constant variable name must be uppercase: ${name}`);
		}

		// Get variable type and default value
		let declaredType: string | null = null;
		let defaultValue: string | number | boolean | null = null;
		const declaredTypeChunk = match[3]?.trim();
		const defaultValueChunk = match[4]?.trim();

		if (declaredTypeChunk) {
			declaredType = validateTypeAnnotation(declaredTypeChunk);
		}

		if (defaultValueChunk) {
			const inferred = determineTypeFromValue(defaultValueChunk);
			defaultValue = inferred.value;
			if (!declaredType) {
				declaredType = inferred.varType;
			}
		}

		// Final checks
		if (defaultValue !== null) {
			const inferredType = determineTypeFromValue(String(defaultValue)).varType;
			if (declaredType && inferredType !== declaredType) {
				throw new Error(
					`Type mismatch for variable '${name}': declared as ${declaredType} but default value is of type ${inferredType}`,
				);
			}
		}

		if (initializer === "const" && defaultValue === null) {
			throw new Error(`Constant variable '${name}' must have a default value.`);
		}

		if (declaredType === "Content" && defaultValue !== null) {
			throw new Error(
				`Variable '${name}' of type Content must not have a default value.`,
			);
		}

		if (!declaredType) {
			throw new Error(
				`Type annotation or default value required for variable '${name}'`,
			);
		}

		variables[name] = {
			type: declaredType,
			default: defaultValue,
			const: initializer === "const",
			sync: initializer === "syn",
			optional: isOptional,
		};
	}

	console.log("Variable lines:", variables);
};
