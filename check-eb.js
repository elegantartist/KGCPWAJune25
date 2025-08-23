import fs from "node:fs";

const has = (p) => fs.existsSync(p);

const out = {
  procfileAtRoot: has("Procfile"),
  ebextensionsConfig: has(".ebextensions/nodejs.config"),
  serverEntry: has("server/index.ts"),
  hasHealthRoute: false,
  scripts: {},
  engines: {}
};

// ✅ Check package.json
if (has("package.json")) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  out.scripts = {
    "build:client": pkg.scripts?.["build:client"] ?? null,
    "build:server": pkg.scripts?.["build:server"] ?? null,
    "build": pkg.scripts?.["build"] ?? null,
    "start": pkg.scripts?.["start"] ?? null
  };
  out.engines = pkg.engines ?? {};
}

// ✅ Check server/index.ts for /api/health route
if (has("server/index.ts")) {
  const s = fs.readFileSync("server/index.ts", "utf8");
  out.hasHealthRoute = /app\.get\(['"]\/api\/health['"]/.test(s);
}

console.log(JSON.stringify(out, null, 2));
