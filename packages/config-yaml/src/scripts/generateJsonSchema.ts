import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { configYamlSchema } from "../schemas/index.js";

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register the root schema with an id so the emitted JSON Schema keeps a
// named root definition ("#/definitions/ConfigYaml"), matching the previous
// zod-to-json-schema output format that the VS Code extension consumes.
configYamlSchema.meta({ id: "ConfigYaml" });

// Convert Zod schema to JSON schema
const jsonSchema = z.toJSONSchema(configYamlSchema, {
  target: "draft-7",
  reused: "inline",
  unrepresentable: "any",
});

// Output directory and file path
const outDir = path.resolve(__dirname, "../../schema");
const outFile = path.join(outDir, "config-yaml-schema.json");

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write the JSON schema to file
fs.writeFileSync(outFile, JSON.stringify(jsonSchema, null, 2));

console.log(`JSON schema has been written to ${outFile}`);
