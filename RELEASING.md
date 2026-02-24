# Releasing

## Automated Publishing

Publishing to npm happens automatically via GitHub Actions with OIDC (no tokens required).

### Release Steps

1. **Update version** in `packages/eden-tanstack-query/package.json`
   - Package name is configured in the same file (`name`), currently `@neilthefisher/eden-tanstack-react-query`

2. **Commit and push**
   ```bash
   git add .
   git commit -m "chore: release vX.Y.Z"
   git push
   ```

3. **Create and push tag**
   ```bash
   git tag vX.Y.Z
   git push --tags
   ```

4. **Done!** GitHub Action will automatically:
   - Run lint, type check, tests
   - Build the package
   - Publish to npm via OIDC

### Monitoring

- Progress: https://github.com/NeilTheFisher/eden-tanstack-query/actions
- npm: https://www.npmjs.com/package/@neilthefisher/eden-tanstack-react-query

## Versioning

Using [SemVer](https://semver.org/):
- `0.1.x` — patches, bugfixes
- `0.x.0` — new features (no breaking changes)
- `x.0.0` — breaking changes

## Troubleshooting

### Recreate tag
```bash
git tag -d vX.Y.Z
git push origin --delete vX.Y.Z
git tag vX.Y.Z
git push --tags
```

### Manual publish (fallback)
```bash
cd packages/eden-tanstack-query
npm login
bun publish --access public
```

## Setup (already done)

- **Trusted Publisher** configured on npm for `@neilthefisher/eden-tanstack-react-query`
- **GitHub Actions** workflow: `.github/workflows/publish.yml`
- **OIDC permissions**: `id-token: write` in workflow
- **Secrets used by workflows**:
  - `CODECOV_TOKEN` (used in `.github/workflows/test.yml` for Codecov upload)
  - No `NPM_TOKEN` is required by publish workflow when Trusted Publisher/OIDC is configured
