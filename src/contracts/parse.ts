import { rxComments } from "../util.ts";
import { type Types, types, type Variable } from "./contractUtil.ts";

const rxContractContent = /(?:^|\n)\[Contract\]\s*([\s\S]*?)(?=\n\[|$)/;
const rxValidVariableName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
const rxValidConst = /^[A-Z_]+$/;

const variableInitializers = ["let", "syn", "const"];

const determineTypeFromValue = (
	value: string,
): {
	varType: Types;
	value: boolean | number | null | string;
} => {
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

const validateTypeAnnotation = (type: string): Types => {
	if (types.includes(type as Types)) {
		return type as Types;
	}
	throw new Error(`Invalid type annotation: ${type}`);
};

export default (markup: string) => {
	const contractString = markup
		.match(rxContractContent)?.[1]
		?.replace(rxComments, "")
		?.trim();

	const variables: Record<string, Variable> = {};

	for (const line of contractString?.split("\n") ?? []) {
		const parts = line
			.trim()
			.split(/\s|:\s?/)
			.map((part) => part.trim())
			.filter((line) => line);

		if (!parts.length) continue;

		console.log("LINE", line, "PARTS", parts);

		// Get initializer
		const initializer = parts[0];
		if (!variableInitializers.includes(initializer)) {
			throw new Error(`Invalid variable declaration: ${line}`);
		}

		// Get variable name
		const name = parts[1];
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
		let declaredType: Types | null = null;
		let defaultValue: string | number | boolean | null = null;
		const nextChunk = parts[2];

		if (nextChunk === "=") {
			const maybeValue = parts[3];
			if (!maybeValue) {
				throw new Error(`Expected default value after '=' in line: ${line}`);
			}
			const { varType, value } = determineTypeFromValue(maybeValue);

			declaredType = varType;
			defaultValue = value;
		} else {
			declaredType = validateTypeAnnotation(parts[2]);

			const nextChunk = parts[3];
			if (nextChunk === "=") {
				const maybeValue = parts[4];
				if (!maybeValue) {
					throw new Error(`Expected default value after '=' in line: ${line}`);
				}
				const { varType, value } = determineTypeFromValue(maybeValue);
				if (varType !== declaredType) {
					throw new Error(
						`Default value type does not match declared type in line: ${line}`,
					);
				}
				defaultValue = value;
			} else if (nextChunk) {
				throw new Error(`Unexpected token '${nextChunk}' in line: ${line}`);
			}
		}

		variables[name] = {
			type: declaredType,
			default: defaultValue,
			const: initializer === "const",
			sync: initializer === "syn",
		};
	}

	console.log("Variable lines:", variables);
};
