# Publishing playload to npm (from your personal PC)

This file is **not** part of the npm package. It is the checklist for the one-time first release, written so it can be done on a personal machine with a personal npm account. Nothing here has been run on the machine this project was built on: no login, no publish.

## 0. Before you start (worth five minutes)

- **Ownership.** If this was built on a company PC or company time, check your employment agreement (or ask) about who owns it before releasing it under your own name. The LICENSE grants everyone broad rights and cannot be taken back for versions already published.
- **Moving the files.** Copying a project from a company machine to a personal one may itself fall under company policy (USB, personal cloud, email). Use whatever route your company allows. Nothing in this project is company-specific: there are no company names, internal URLs or machine paths in it (checked, including inside the would-be npm tarball).

## 1. What to copy

The whole project folder **except** `node_modules/` and `dist/` (both are regenerated), and except any `.claude/` folder. You need at least:

```
src/  demo/  scripts/  README.md  PUBLISHING.md  LICENSE  package.json  package-lock.json
tsconfig.json  tsconfig.build.json  vite.config.ts  vite.react.config.ts  index.html  react.html
```

## 2. One-time setup on the personal PC

1. Install **Node.js 22.6 or newer** (24 recommended) from nodejs.org. The build uses `node --experimental-strip-types`, which older versions lack.
2. Create a free account at **npmjs.com** with your personal email and verify the email.
3. Turn on **two-factor authentication** (Account → Two-Factor Authentication). npm requires it to publish. Keep the recovery codes somewhere safe.

## 3. Fill in your details

1. **Your name is already filled in** as `Babar Ali` in the three places that carry it: `package.json` (`author`), `LICENSE`, and the last line of `README.md`. Check that this is exactly how you want it to appear publicly. `author` may also be `"Babar Ali <you@example.com>"`; only add an email you are happy to make public.
2. In `package.json`, **delete the line `"private": true`**. It is the one safety lock still on; npm refuses to publish while it is there.
3. Optional but recommended, if you create a GitHub repo, add these to `package.json` so the npm page links to it:
   ```json
   "repository": { "type": "git", "url": "git+https://github.com/YOU/playload.git" },
   "homepage": "https://github.com/YOU/playload#readme",
   "bugs": { "url": "https://github.com/YOU/playload/issues" }
   ```

`npm publish` runs `scripts/check-release.mjs` first and **refuses** while `"private": true` is still there, a name placeholder is left, or the license is wrong, so a half-finished release cannot go out.

## 4. Build and test

```bash
npm install
npm run typecheck
npm run build
npm run test:package     # installs the real tarball into a clean temp project and uses it
```

`test:package` must print only `PASS` lines. It is the test that proves the *published* files work (ESM, CommonJS, React server rendering, types, the CSS export). Do not publish if it fails.

Optional: try the demos with `npm run dev` (pages `/` and `/react.html`).

## 5. Publish

```bash
npm login                # opens a browser or asks for username, password and a code
npm whoami               # should print YOUR personal username
npm publish --dry-run    # shows exactly which files will go out: about 28 files, dist/ + README + LICENSE
npm publish              # the real thing; enter the 6-digit code from your authenticator app
```

`npm publish` also runs the checks from step 4 automatically (`prepublishOnly`).

The name **`playload` was free** when checked; if someone takes it before you publish, npm will say so, and you can rename the package (change `"name"`, and the strings `playload` in `README.md`, `scripts/smoke-package.mjs` and `vite.react.config.ts`) or publish under your own scope (`"name": "@yourname/playload"`, then `npm publish --access public`).

## 6. Check it worked

```bash
npm view playload                    # shows version 0.1.0
```

Then, in an empty folder, `npm init -y && npm i playload` and try the Quick start from the README. Open https://www.npmjs.com/package/playload and check the README renders and the license shows as MIT.

## 7. Releasing later versions

```bash
npm version patch    # 0.1.0 -> 0.1.1 (bug fix). Use "minor" for features, "major" for breaking changes.
npm publish
```

- A published version number can **never be reused or changed**. Fix forward with a new version.
- While the version starts with `0.`, breaking changes in a minor release are accepted by convention.
- You can unpublish within 72 hours of publishing if nothing depends on it; after that, use `npm deprecate playload@0.1.0 "use 0.1.1"`.
- The README says the package was only verified on an *emulated* phone. If you test on real devices (see the checklist in the README), update that note.

## 8. Good habits

- Never put an npm token or password in a file in this folder. Use `npm login` (interactive).
- If you later publish from CI, use a granular access token limited to this package, or npm's trusted publishing, never your account password.
- Turn on 2FA for **publishing and login**, not just login.
