# Relametric media and sharing kit

## Positioning

**Follow the data. Find the next move.**

Relametric is an open-source TypeScript toolkit for connected-data visualization on Three.js. Explore the records behind a chart, connect quantitative signals to customer evidence, and build an investigation for conversion, retention or product decisions.

Short repository description: **Interactive visualizations for connected evidence. 50 examples, 44 connector factories, and workflows for conversion, retention and product decisions.**

## Ready-to-adapt launch copy

> Meet Relametric: an open-source TypeScript toolkit for exploring the records behind a chart. Follow checkout drop-offs, investigate retention, and connect product opportunities to usage and interview evidence. Start with 50 editable examples and 45 connector guides. Experimental alpha, MIT licensed. Demo data is synthetic.
>
> Try it: https://kevin-owens-product.github.io/Relametric/
> Source: https://github.com/kevin-owens-product/Relametric

Short social post:

> Follow the data. Find the next move. Relametric connects interactive visualizations to the records behind them. 50 editable examples, 45 connector guides, TypeScript + Three.js. Open-source alpha; synthetic demos. https://kevin-owens-product.github.io/Relametric/

Do not describe scenarios as measured conversion lift, retention improvement or customer results. Cloud adapter protocol tests are not live-account certification. npm publication is still pending; do not announce registry availability before verification.

## Images in the repository root

| File | Intended use |
| --- | --- |
| `relametric-social.png` | 1200×630 preview for social posts and GitHub repository sharing |
| `relametric-overview.png` | Homepage screenshot, 1440×960 |
| `relametric-conversion.png` | Checkout evidence workflow, 1440×960 |
| `relametric-retention.png` | Retention evidence workflow, 1440×960 |
| `relametric-product.png` | Product opportunity workflow, 1440×960 |
| `relametric-connectors.png` | Connector discovery screenshot, 1440×960 |

These are captures of the actual application and a composed social card using the conversion capture. They contain fictional records. They are included under the repository's MIT license; retain the synthetic-data context when reusing them. No customer logo or endorsement is implied.

To regenerate: start `npm run dev`, install Playwright Chromium, then run `node scripts/capture-marketing.mjs` from the root. Set `RELAMETRIC_PREVIEW_URL` if the local port differs. Review every image before committing. Run `npm run build:demo` to copy the social image into the website output.

## Sharing behavior and rollout

Homepage, gallery, playground and connector guide HTML contain static Open Graph and Twitter large-image metadata with absolute URLs under `/Relametric/`. Connector guides have their own canonical URL, title and description. The shared image is intentionally project-wide. Hash/query-based gallery recipes currently share the generic gallery preview; recipe-specific previews require separate prerendered recipe pages.

The homepage offers native sharing where supported and a copy-link fallback. Canceling a native share does not send anything. Posting to an account remains a user action.

After the preparation PR merges, deploy Pages and verify that `https://kevin-owens-product.github.io/Relametric/relametric-social.png` returns a PNG. Check previews using the target platform's sharing inspector; social crawlers may cache previous metadata. Local metadata verification does not prove a refreshed external-platform preview.

For GitHub's repository preview, upload the root `relametric-social.png` in **Repository Settings → General → Social preview**. GitHub does not use the Pages Open Graph image for this setting. This manual upload is separate from committing the image. Use the same image for release announcements and attach screenshots when showing a specific workflow.
