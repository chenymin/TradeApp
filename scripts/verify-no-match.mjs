#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/verify-no-match.mjs <rg args>");
  process.exit(2);
}

const result = spawnSync("rg", args, {
  encoding: "utf8",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status === 1) {
  process.exit(0);
}

if (result.status === 0) {
  process.exit(1);
}

process.exit(result.status ?? 2);
