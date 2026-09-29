# Deployment

Production: https://demosha2026.storkyproduct.ru

- Push to `main`: Linux CI installs locked dependencies, checks game rules and TypeScript, builds the web app, runs a full browser playthrough, then deploys the tested artifact.
- Pull requests: the same checks and web artifact, without server access.
- Tag `vX.Y.Z`: Windows CI checks the version, builds the portable EXE, tests the packaged app and a copied standalone EXE, then publishes the EXE and SHA256 checksum in GitHub Releases.
- To release the next version: update `package.json` and `package-lock.json`, push `main`, create the matching tag, then push that tag.
- `Web CI and deployment` also supports manual runs from Actions on `main`.
- `Windows portable release` can be run manually from `main` with an existing version tag; it checks out and builds that tag rather than whatever happens to be at `main`.

## Server isolation

Only this site's Nginx virtual host and `/srv/demosha2026` are used. No Docker containers, shared application ports, or other website files are modified. Builds happen on GitHub runners, not on the server.

The `demosha-deploy` account has no sudo privileges. Its SSH key has a forced command and disables forwarding and PTY access. The receiver accepts only `deploy <commit SHA>` plus a compressed website on stdin; it rejects traversal paths, links, special files, and oversized archives. It extracts a fresh release, atomically switches `current`, checks the local virtual host, and restores the previous version if the health check fails. Five recent releases and the previous active version are retained.

GitHub Actions repository secrets:

- `DEMOSHA_DEPLOY_SSH_KEY`: dedicated private deployment key, never the root password.
- `DEMOSHA_DEPLOY_KNOWN_HOSTS`: pinned server host key. Host-key verification is mandatory.

Server layout:

```text
/srv/demosha2026/releases/<timestamp>-<commit>-<id>/
/srv/demosha2026/current -> active release
/srv/demosha2026/previous -> previous successful release
/srv/demosha2026/acme/ -> Let's Encrypt webroot
/usr/local/libexec/demosha2026-deploy -> root-owned receiver
/etc/nginx/sites-available/demosha2026.storkyproduct.ru
```

TLS uses a dedicated Let's Encrypt certificate and webroot renewal. Existing certificates and Nginx site configurations are not edited. Deployment does not restart or reload Nginx: only the release symlink changes.

## Manual rollback (server administrator)

Inspect `readlink -f /srv/demosha2026/previous`. Confirm it is an existing directory under `/srv/demosha2026/releases/`, then switch `current` atomically to that directory. No Nginx restart is required. To redeploy the current `main`, rerun the web workflow.

Bootstrap is intentionally one-time and refuses to overwrite an existing site, user, or directory. The root password and deployment private key are never committed.
