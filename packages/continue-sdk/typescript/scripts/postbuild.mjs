#!/usr/bin/env node
// Portable equivalent of the copy steps in build.sh (Windows-safe).
// The SDK resolves the hub-api client at runtime via dist/api/dist, and
// dist/api/package.json provides "typings"/"main" resolution for deep imports like
// "@continuedev/sdk/dist/api/dist/index.js".
import { cpSync } from "fs";

cpSync("api/dist", "dist/api/dist", { recursive: true });
cpSync("api/package.json", "dist/api/package.json");
console.log("✓ Copied api build output into dist/api");
