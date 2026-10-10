# Data Model: Deploy the Main Site to GitHub Pages

No new data entities. This feature is a CI/CD and build-config change — it
publishes the existing static build output to GitHub Pages; it does not
introduce any new data shape, storage, or persisted entity. The only
"state" involved is the published file tree on the `gh-pages` branch, which
is an artifact of the build (see `research.md` Decision 2), not a domain
entity.
