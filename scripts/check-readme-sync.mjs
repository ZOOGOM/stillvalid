import { readFile } from "node:fs/promises";
import path from "node:path";

// Resolve relative destinations, while leaving external URLs and local anchors
// alone. The English text remains the same even though the files live in
// different directories and must use different paths to their assets.
function normalize(text, directory) {
  const target = (value) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(value)) return value;
    const [file, ...fragment] = value.split("#");
    const resolved = path.posix.resolve("/", directory, file);
    return resolved + (fragment.length ? "#" + fragment.join("#") : "");
  };
  return text
    .replace(/\]\((?:<([^>]+)>|([^\)]+))\)/g, (_, angle, plain) => `](${target(angle || plain)})`)
    .replace(/src="([^"]+)"/g, (_, value) => `src="${target(value)}"`);
}
const [main, english] = await Promise.all([
  readFile("README.md", "utf8"),
  readFile("readme(language)/README.en.md", "utf8"),
]);
if (normalize(main, "/") !== normalize(english, "/readme(language)")) {
  console.error("The default and English READMEs differ beyond their relative links.");
  process.exitCode = 1;
} else {
  console.log("Default and English README content matches.");
}
