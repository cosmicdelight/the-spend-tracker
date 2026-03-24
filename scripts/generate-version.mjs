import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const packageVersion = process.env.npm_package_version || "0.0.0";
const buildTime = new Date().toISOString();

const outputPath = resolve(process.cwd(), "public/version.json");
const payload = JSON.stringify(
  {
    version: packageVersion,
    buildTime,
  },
  null,
  2,
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${payload}\n`, "utf8");
