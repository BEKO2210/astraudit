import { describe, it, expect } from "vitest";
import { runAudit } from "../../../src/lib/audit/auditEngine";
import { makeBundle } from "../../fixtures/builders";

/**
 * Fixture-based reproduction of expressjs/express auditing.
 *
 * Tree shape mirrors the live repo (master branch as of 2026):
 *  - Old-Node-era filenames: Readme.md, History.md, Code-Of-Conduct.md
 *  - .eslintrc.yml (YAML eslint config, not in IMPORTANT_ROOT_FILES)
 *  - Mocha tests in test/<name>.js (no .test. in filename)
 *  - Makefile + Charter.md + Collaborator-Guide.md + Triager-Guide.md
 *  - .github/{CODEOWNERS,dependabot.yml,workflows/ci.yml}
 *
 * Bug report: score is 53/100 with structure/code-quality/security
 * marked weak — which is wrong because all those files exist.
 */
describe("Real-repo audits — expressjs/express", () => {
  function buildExpressBundle() {
    return makeBundle({
      paths: [
        ".editorconfig",
        ".eslintignore",
        ".eslintrc.yml",
        ".git-blame-ignore-revs",
        ".github/CODEOWNERS",
        ".github/dependabot.yml",
        ".github/workflows/ci.yml",
        ".gitignore",
        ".mailmap",
        ".nycrc",
        "Charter.md",
        "Code-Of-Conduct.md",
        "Collaborator-Guide.md",
        "Contributing.md",
        "History.md",
        "LICENSE",
        "Makefile",
        "Readme.md",
        "Security.md",
        "Triager-Guide.md",
        "benchmarks/middleware.js",
        "examples/hello-world/index.js",
        "examples/auth/index.js",
        "index.js",
        "lib/application.js",
        "lib/express.js",
        "lib/middleware/init.js",
        "lib/middleware/query.js",
        "lib/request.js",
        "lib/response.js",
        "lib/router/index.js",
        "lib/router/layer.js",
        "lib/router/route.js",
        "lib/utils.js",
        "lib/view.js",
        "package.json",
        "test/Route.js",
        "test/Router.js",
        "test/app.js",
        "test/express.js",
        "test/express.urlencoded.js",
        "test/req.acceptsCharsets.js",
        "test/res.send.js",
        "test/support/utils.js",
      ],
      importantFiles: {
        "package.json": JSON.stringify({
          name: "express",
          version: "5.0.0",
          dependencies: {
            "body-parser": "^2.0.0",
            "cookie-signature": "^1.2.0",
            "debug": "^4.3.4",
            "merge-descriptors": "^2.0.0",
          },
          devDependencies: {
            "eslint": "^8.50.0",
            "mocha": "^10.0.0",
            "supertest": "^6.0.0",
            "nyc": "^15.1.0",
          },
          scripts: {
            test: "mocha --require test/support/env --reporter spec --check-leaks --no-exit test/",
            "test-ci": "nyc --reporter=lcov --reporter=text-summary npm test",
            lint: "eslint .",
          },
          license: "MIT",
          engines: { node: ">= 18" },
        }),
        "Readme.md":
          "# Express\n\nFast, unopinionated, minimalist web framework for Node.js.\n\n" +
          "[![NPM Version][npm-version-image]][npm-url]\n" +
          "## Installation\n\n```bash\nnpm install express\n```\n\n" +
          "## Quick Start\n\n```js\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => res.send('hello'));\napp.listen(3000);\n```\n\n" +
          "## Features\n\n- Fast\n- Routing\n- Middleware\n\n" +
          "## API\n\nSee [api.md](docs/api.md) for the API reference.\n\n" +
          "## Examples\n\nSee the [examples](examples/) directory.\n\n" +
          "## License\n\n[MIT](LICENSE)\n\n" +
          "[npm-version-image]: https://badgen.net/npm/v/express\n" +
          "[npm-url]: https://npmjs.org/package/express\n" +
          // padding to >= 800 chars
          "\n## Detailed docs\n\nThis section exists to ensure the README has substantial length for the docs detector. Express has comprehensive documentation covering routing, middleware, error handling, template engines, and more.\n",
        "History.md": "# 5.0.0 / 2025-09-09\n\n* Breaking change list...\n",
        "Security.md": "# Security Policy\n\nReport vulnerabilities to security@expressjs.com.\n",
        "Code-Of-Conduct.md": "# Code of Conduct\n\nWe pledge...\n",
        "Contributing.md": "# Contributing\n\nThanks for contributing!\n",
        ".github/CODEOWNERS": "* @expressjs/express-tc\n",
        ".github/dependabot.yml":
          "version: 2\nupdates:\n  - package-ecosystem: \"npm\"\n    directory: \"/\"\n    schedule:\n      interval: \"weekly\"\n",
        "Makefile":
          "BIN := ./node_modules/.bin\nDOCS_TESTS := $(shell find docs -name '*.test')\nMOCHA := $(BIN)/mocha\n\ntest:\n\t$(MOCHA)\n",
      },
      readmeContent:
        "# Express\n\nFast, unopinionated, minimalist web framework for Node.js.\n\n" +
        "[![NPM Version][npm-version-image]][npm-url]\n" +
        "[![Build Status][github-actions-ci-image]][github-actions-ci-url]\n\n" +
        "## Installation\n\n```bash\nnpm install express\n```\n\n" +
        "## Quick Start\n\n```js\nconst express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => res.send('hello'));\napp.listen(3000);\n```\n\n" +
        "## Features\n\n- Fast\n- Routing\n- Middleware\n\n" +
        "## API\n\nSee [api.md](docs/api.md) for the API reference.\n\n" +
        "## Examples\n\nSee the [examples](examples/) directory.\n\n" +
        "## Screenshots\n\n![demo](docs/demo.png)\n\n" +
        "## License\n\n[MIT](LICENSE)\n\n" +
        "[npm-version-image]: https://img.shields.io/npm/v/express\n" +
        "[npm-url]: https://npmjs.org/package/express\n" +
        "[github-actions-ci-image]: https://img.shields.io/github/actions/workflow/status/expressjs/express/ci.yml\n" +
        "[github-actions-ci-url]: https://github.com/expressjs/express/actions/workflows/ci.yml\n\n" +
        "## Detailed docs\n\nThis section exists to ensure the README has substantial length for the docs detector. Express has comprehensive documentation covering routing, middleware, error handling, template engines, and more.\n",
      metadata: {
        name: "express",
        fullName: "expressjs/express",
        defaultBranch: "master",
        owner: {
          login: "expressjs",
          avatarUrl: "https://avatars.example/expressjs",
          htmlUrl: "https://github.com/expressjs",
          type: "Organization",
        },
        stars: 64000,
        forks: 14000,
        description:
          "Fast, unopinionated, minimalist web framework for Node.js.",
        homepage: "https://expressjs.com",
        topics: ["nodejs", "framework", "javascript", "express", "web"],
        language: "JavaScript",
        license: { spdxId: "MIT", name: "MIT License" },
        pushedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      },
      languages: { JavaScript: 950_000 },
      workflows: [
        { id: 1, name: "CI", state: "active", path: ".github/workflows/ci.yml" },
      ],
      recentCommits: Array.from({ length: 20 }, (_, i) => ({
        sha: `abc${i}`,
        message: `commit ${i}`,
        author: "tjwebb",
        date: new Date(Date.now() - i * 86_400_000).toISOString(),
        url: "",
      })),
      releases: Array.from({ length: 5 }, (_, i) => ({
        id: i,
        name: `5.0.${i}`,
        tagName: `5.0.${i}`,
        publishedAt: new Date().toISOString(),
        prerelease: false,
        draft: false,
        url: "",
      })),
    });
  }

  it("still credits documentation when /readme is rate-limited but tree has Readme.md", () => {
    const bundle = buildExpressBundle();
    // Simulate the rate-limited path: /readme API returned null.
    bundle.readme = null;
    const result = runAudit(bundle);
    const docs = result.categories.find((c) => c.key === "documentation")!;
    // Even without readme content we should at least credit "README present"
    // (3 base points) rather than scoring 0/15.
    expect(docs.score).toBeGreaterThanOrEqual(3);
    expect(docs.status).not.toBe("missing");
  });

  it("scores expressjs/express well above the 'Risky' threshold (≥ 70)", () => {
    const result = runAudit(buildExpressBundle());
    const byKey = Object.fromEntries(
      result.categories.map((c) => [c.key, c]),
    );
    // Print useful diagnostics on failure so we can see WHERE the
    // points are lost.
    if (result.totalScore < 70) {
      // eslint-disable-next-line no-console
      console.log("Express audit broke down as:", {
        total: result.totalScore,
        max: result.maxScore,
        grade: result.grade,
        verdict: result.verdict,
        cats: result.categories.map((c) => ({
          k: c.key,
          score: `${c.score}/${c.max}`,
          status: c.status,
          ev: c.evidence,
        })),
      });
    }
    expect(result.totalScore).toBeGreaterThanOrEqual(70);
    // Verify the three categories the user said were "weak" are NOT
    // weak (score >= 60% of max).
    expect(byKey.structure.score / byKey.structure.max).toBeGreaterThanOrEqual(0.6);
    expect(byKey.quality.score / byKey.quality.max).toBeGreaterThanOrEqual(0.6);
    expect(byKey.security.score / byKey.security.max).toBeGreaterThanOrEqual(0.6);
  });
});
