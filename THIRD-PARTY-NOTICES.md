# Third-Party Notices

Storefront bundles the following third-party assets and libraries. Each is
distributed under its own license; the MIT license of this project does not
apply to them, and this project claims no ownership over them.

## Bundled front-end assets

| Asset | Location | License | Source |
|---|---|---|---|
| Font Awesome Free 6.5.2 | `public-html/assets/fontawesome/` | Icons: CC BY 4.0 · Fonts: SIL OFL 1.1 · Code: MIT | https://fontawesome.com |
| Shabnam font | `public-html/assets/fonts/` | SIL Open Font License 1.1 | https://github.com/rastikerdar/shabnam-font |
| Chart.js | `public-html/assets/js/vendor/chart.min.js` | MIT | https://www.chartjs.org |
| jalaali-js | `public-html/assets/js/vendor/jalaali.min.js` | MIT | https://github.com/jalaali/jalaali-js |

## Placeholder media

Images under `public-html/assets/images/` (products, hero, categories) are
neutral placeholders included so the demo store renders. Replace them with
your own media before deploying.

## npm dependencies

Runtime dependencies are listed in `package.json` and installed from the npm
registry; their licenses are available in `node_modules/<pkg>/LICENSE` after
`npm install`. Notable ones: express, mongoose, multer, sharp, telegraf,
exceljs, adm-zip, bson, cookie-parser, dotenv (all permissive: MIT / Apache-2.0
/ BSD).
