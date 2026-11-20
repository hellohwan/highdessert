# highdessert

Situs PT High-Desert Indonesia — https://dev-highdesert.xeemore.com

## Deploy otomatis

Setiap `git push` ke `main`, GitHub Actions (`.github/workflows/deploy.yml`) akan:

1. membuat ulang `style.min.css`, `script.min.js`, `motion.min.js`, `i18n.min.js` dari file sumbernya,
2. menambahkan `?v=<hash>` ke semua CSS, JS, gambar, font, dan video, sehingga pengunjung langsung mendapat versi baru,
3. men-deploy hasilnya ke GitHub Pages.

Cukup edit `style.css`, `script.js`, `motion.js`, `i18n.js`, atau file HTML seperti biasa, lalu push. Progres deploy terlihat di tab **Actions**.

## Cek di komputer sendiri

```bash
npm install        # sekali saja
npm run build      # hasil di _site/
npx serve _site -l 3000   # buka http://localhost:3000
```
