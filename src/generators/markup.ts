import { rxComments } from "../util.ts";

const rxMarkupContent = /(?:^|\n)\[Markup\]\s*([\s\S]*?)(?=\n\[|$)/;

export type MarkupType =
	| "h1"
	| "h2"
	| "h3"
	| "p"
	| "button"
	| "input"
	| "image";

export type MarkupElement = {
	type: MarkupType;
	content?: string;
};

export const getMarkup = (content: string) => {
	const markupString = content
		.match(rxMarkupContent)?.[1]
		?.replace(rxComments, "")
		?.trim();

	const markupElements: MarkupElement[] = [];
	for (const line of markupString?.split("\n") ?? []) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;

		const block: MarkupElement = {
			type: "p",
			content: "",
		};

		if (trimmedLine.startsWith("# ")) {
			block.type = "h1";
			block.content = trimmedLine.slice(2).trim();
		} else if (trimmedLine.startsWith("## ")) {
			block.type = "h2";
			block.content = trimmedLine.slice(3).trim();
		} else if (trimmedLine.startsWith("### ")) {
			block.type = "h3";
			block.content = trimmedLine.slice(4).trim();
		} else {
			block.content = trimmedLine;
		}

		markupElements.push(block);
	}

	return markupElements;
};
