# Deployment

The app is static and hosted on GitHub Pages at
`https://tobiasbrandstaedter.github.io/y2k-cam/`.

`.github/workflows/deploy-pages.yml` builds `dist/` on every push to `main`
and publishes it through the Pages deployment API. The workflow sets
`VITE_BASE_PATH=/y2k-cam/` so asset URLs carry the repo prefix; local builds
and `pnpm dev` keep running at `/`.

## One-time setup in GitHub

1. Open the repo on github.com, Settings, Pages.
2. Under "Build and deployment", set Source to "GitHub Actions". No branch
   selection, no `gh-pages` branch.
3. Commit and push this change set to `main`. The workflow runs on that push.
4. Watch the run under the Actions tab. The deploy job prints the final URL.

To redeploy without a code change, use "Run workflow" on the Actions page
(the workflow accepts `workflow_dispatch`).

## Things to keep in mind

- A PWA manifest and service worker do not exist yet. When they are added,
  every URL in them must use `import.meta.env.BASE_URL` instead of `/`, and
  the service worker scope must be the repo prefix. Otherwise installation
  works locally and breaks on Pages.
- Pages serves over HTTPS, which the camera, share sheet and service worker
  need on iOS. Nothing to configure.
- GitHub Pages has no server side. That matches the vision: static hosting
  only.
