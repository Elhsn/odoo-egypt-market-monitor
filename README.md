# Odoo Egypt market monitor

Live public dashboard tracking the Odoo partner market in Egypt: partners, referenced clients, new clients, movements, changes, alerts and trends.

**Website:** https://elhsn.github.io/odoo-egypt-market-monitor/

- Data source: the public [Odoo partner directory for Egypt](https://www.odoo.com/partners/country/egypt-64), checked hourly with full profile scans every three hours.
- `site/` is a fully static site (no build step, no dependencies): `index.html`, `styles.css`, `app.js`, plus `data.json` and `chart.png` as the dataset.
- `.github/workflows/sync.yml` refreshes `site/data.json` and `site/chart.png` every 30 minutes from the already-published public dashboard snapshot (`scripts/sync.py`), commits on change, and deploys `site/` to GitHub Pages. No credentials, tokens or private data are used; only the public published snapshot is read.
- Monitoring observations are not evidence of acquisitions, contract losses or commercial transfers. History is cumulative since 2026-10-11; older sightings come from partial web.archive.org samples.
