export type TextAreaSelection = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function applyTextareaEdit(
  current: string,
  selectionStart: number,
  selectionEnd: number,
  nextValue: string,
  nextCursor: number,
): { value: string; selectionStart: number; selectionEnd: number } {
  return {
    value: nextValue,
    selectionStart: nextCursor,
    selectionEnd: nextCursor,
  };
}

export function wrapTextareaSelection(
  current: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string,
  placeholder = "texte",
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = selectionStart ?? current.length;
  const end = selectionEnd ?? start;
  const selected = current.slice(start, end);
  const inner = selected || placeholder;
  const insert = `${before}${inner}${after}`;
  const value = `${current.slice(0, start)}${insert}${current.slice(end)}`;
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + inner.length;
  return { value, selectionStart: cursorStart, selectionEnd: cursorEnd };
}

export function prefixTextareaLines(
  current: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = selectionStart ?? current.length;
  const end = selectionEnd ?? start;
  const block = current.slice(start, end) || "";
  const lines = (block || "").split("\n");
  const prefixed = lines.map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`)).join("\n");
  const value = `${current.slice(0, start)}${prefixed}${current.slice(end)}`;
  return { value, selectionStart: start, selectionEnd: start + prefixed.length };
}

export function setHeadingOnLine(
  current: string,
  selectionStart: number,
  level: 1 | 2 | 3,
): { value: string; selectionStart: number; selectionEnd: number } {
  const pos = selectionStart ?? current.length;
  const lineStart = current.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
  const lineEndIdx = current.indexOf("\n", pos);
  const lineEnd = lineEndIdx === -1 ? current.length : lineEndIdx;
  const line = current.slice(lineStart, lineEnd).replace(/^#+\s*/, "");
  const hashes = "#".repeat(level);
  const nextLine = `${hashes} ${line.trim()}`;
  const value = `${current.slice(0, lineStart)}${nextLine}${current.slice(lineEnd)}`;
  return { value, selectionStart: lineStart, selectionEnd: lineStart + nextLine.length };
}

export function appendMarkdownBlock(current: string, block: string): string {
  const trimmed = current.trimEnd();
  if (!trimmed) return block.trim();
  return `${trimmed}\n\n${block.trim()}\n`;
}
