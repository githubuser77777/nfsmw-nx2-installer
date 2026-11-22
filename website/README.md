# Switch 2 installer

This site adapts the [original installer](https://github.com/StevensND/nfsmw-nx-installer) for the USA Switch 2
release. It checks the selected NRO's SHA-256 and generates shaders and the ZIP from the user's own game
in the browser. The original installer engine is GPL-3.0; see [LICENSE](LICENSE) and
[UPSTREAM-NOTICES.md](UPSTREAM-NOTICES.md).

## Local preview

Serve the site over HTTPS or localhost:

```powershell
python -m http.server 8193 --directory website
```

Open `http://localhost:8193/` in desktop Chrome or Edge. It requires the File System Access API to stream ZIPs
without holding the whole game in memory. An ISO or extracted game folder of the supported USA edition is
required, along with the USA Switch 2 NRO selected from the release. GitHub does not allow browser fetches of
release assets from another origin, so the NRO must be downloaded and selected manually. Game files and the
NRO are read locally and never uploaded. The update package excludes game files and must be
extracted over an existing installation.

The generated shader library is checked against the known USA fingerprint. This is experimental: the release
NRO and packages produced by this site have not yet been tested on Switch 2 hardware.

## Publishing

The manually triggered **Deploy Switch 2 installer** workflow deploys `website/` to GitHub Pages. Configure
Pages to use GitHub Actions before running it. The game-derived NRO is not checked into the repository.

Run the input-validation checks with `node --test website/test/pipeline.test.js`.
