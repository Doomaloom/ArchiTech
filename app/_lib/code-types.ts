export type CodeLanguage =
  | "typescript"
  | "javascript"
  | "css"
  | "json"
  | "svg"
  | "markdown"
  | "html"
  | "text";

export interface EditableCodeFile {
  id: string;
  label: string;
  language: CodeLanguage;
}

export interface CodeFileGroup {
  label: string;
  items: EditableCodeFile[];
}
