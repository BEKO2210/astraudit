export interface ExampleRepo {
  fullName: string;
  blurb: string;
}

export const EXAMPLE_REPOS: ExampleRepo[] = [
  { fullName: "facebook/react", blurb: "UI library, monorepo, mature OSS." },
  { fullName: "vuejs/core", blurb: "TypeScript-first framework." },
  { fullName: "expressjs/express", blurb: "Classic Node.js web server." },
  { fullName: "lodash/lodash", blurb: "Utility library, low-noise codebase." },
];
