import type { Copy } from "./ui-base";
import type { ResultCopyKey } from "./result-i18n";

export type UiCopy = Omit<Copy, ResultCopyKey>;
