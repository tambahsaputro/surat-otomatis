const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/generated', express.static(path.join(__dirname, 'generated')));

// Buat folder generated kalau belum ada
const outputDir = path.join(__dirname, 'generated');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Render HTML dinamis
function renderHTML(template, data) {
  return template.replace(/{{(.*?)}}/g, (_, key) => data[key.trim()] || '');
}

app.get('/', (req, res) => {
  res.render('form');
});

app.post('/generate', async (req, res) => {
  const { jenis, nama, alamat, keperluan, tanggal } = req.body;
  const slug = jenis.toLowerCase().replace(/\s+/g, '-');
  const templatePath = path.join(__dirname, 'templates', `surat-${slug}.html`);

  if (!fs.existsSync(templatePath)) {
    return res.send('❌ Template tidak ditemukan.');
  }

  const rawTemplate = fs.readFileSync(templatePath, 'utf8');
  const filledHTML = renderHTML(rawTemplate, { nama, alamat, keperluan, tanggal });

  const safeNama = nama.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${slug}_${safeNama}.pdf`;
  const pdfPath = path.join(outputDir, filename);

  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(filledHTML, { waitUntil: 'networkidle0' });
    await page.pdf({ path: pdfPath, format: 'A4' });
    await browser.close();

    res.render('success', { link: `/generated/${filename}` });
  } catch (err) {
    console.error(err);
    res.send('❌ Gagal membuat PDF.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server jalan di http://localhost:${PORT}`);
});
