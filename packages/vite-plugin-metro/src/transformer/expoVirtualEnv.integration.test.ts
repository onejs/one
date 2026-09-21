import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(__dirname, "../../../..");
const metroBin = path.join(workspaceRoot, "node_modules/.bin/metro");
const fixtureDirs: string[] = [];

afterAll(() => {
	for (const fixtureDir of fixtureDirs) {
		rmSync(fixtureDir, { recursive: true, force: true });
	}
});

describe("optional Expo env through One Metro", () => {
	it("executes babel-preset-expo env references in development and production", () => {
		const fixtureDir = mkdtempSync(path.join(workspaceRoot, "tmp-expo-env-"));
		fixtureDirs.push(fixtureDir);

		writeFileSync(
			path.join(fixtureDir, "package.json"),
			JSON.stringify({ name: "one-expo-env-fixture", private: true }),
		);
		writeFileSync(path.join(fixtureDir, ".watchmanconfig"), "{}\n");
		writeFileSync(
			path.join(fixtureDir, "tsconfig.json"),
			JSON.stringify({ compilerOptions: { baseUrl: ".", paths: {} } }),
		);
		writeFileSync(
			path.join(fixtureDir, "babel.config.cjs"),
			`module.exports = { presets: ['babel-preset-expo'] }\n`,
		);
		writeFileSync(
			path.join(fixtureDir, "metro.config.cjs"),
			`const { withOne } = require('one/metro-config')
module.exports = withOne(__dirname, { loadViteConfig: false })
`,
		);
		writeFileSync(
			path.join(fixtureDir, ".env"),
			"EXPO_PUBLIC_SENTINEL=development-dotenv-value\nPRIVATE_SENTINEL=private-value\n",
		);
		writeFileSync(
			path.join(fixtureDir, "index.js"),
			`console.log('observed:' + process.env.EXPO_PUBLIC_SENTINEL)\n`,
		);

		const bundle = (dev: boolean, sentinel: string, resetCache = false) => {
			const bundlePath = path.join(
				fixtureDir,
				`bundle.${dev ? "dev" : "prod"}.js`,
			);
			execFileSync(
				metroBin,
				[
					"build",
					"index.js",
					"--config",
					"metro.config.cjs",
					"--platform",
					"ios",
					"--dev",
					String(dev),
					"--minify",
					"false",
					"--out",
					bundlePath,
					...(resetCache ? ["--reset-cache"] : []),
				],
				{
					cwd: fixtureDir,
					encoding: "utf8",
					env: { ...process.env, EXPO_PUBLIC_SENTINEL: sentinel },
					timeout: 180_000,
				},
			);
			return {
				code: readFileSync(bundlePath, "utf8"),
				output: execFileSync(process.execPath, [bundlePath], {
					cwd: fixtureDir,
					encoding: "utf8",
				}),
			};
		};

		const development = bundle(true, "development-process-value", true);
		expect(development.code).toContain("expo/virtual/env.js");
		expect(development.output).toContain("observed:development-dotenv-value");
		expect(development.code).not.toContain("private-value");

		writeFileSync(
			path.join(fixtureDir, ".env"),
			"EXPO_PUBLIC_SENTINEL=updated-dotenv-value\nPRIVATE_SENTINEL=updated-private-value\n",
		);
		const updatedDevelopment = bundle(true, "updated-process-value");
		expect(updatedDevelopment.output).toContain(
			"observed:updated-dotenv-value",
		);
		expect(updatedDevelopment.code).not.toContain("updated-private-value");

		const production = bundle(false, "production-process-value");
		expect(production.code).not.toContain("expo/virtual/env.js");
		expect(production.output).toContain("observed:production-process-value");
	}, 180_000);
});
