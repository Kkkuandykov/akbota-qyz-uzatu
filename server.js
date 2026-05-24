const express = require('express');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'akbota2026';

const DATA_DIR = path.join(__dirname, 'data');
const XLSX_PATH = path.join(DATA_DIR, 'rsvp.xlsx');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function loadOrCreateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(XLSX_PATH)) {
    await workbook.xlsx.readFile(XLSX_PATH);
    return workbook;
  }
  const sheet = workbook.addWorksheet('Қонақтар', {
    properties: { defaultRowHeight: 22 },
  });
  sheet.columns = [
    { header: '№', key: 'id', width: 6 },
    { header: 'Күні мен уақыты', key: 'timestamp', width: 22 },
    { header: 'Аты-жөні', key: 'name', width: 35 },
    { header: 'Жауап', key: 'response', width: 18 },
    { header: 'IP', key: 'ip', width: 18 },
  ];
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8B6F47' },
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  await workbook.xlsx.writeFile(XLSX_PATH);
  return workbook;
}

app.post('/api/rsvp', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 200);
    const response = String(req.body.response || '').trim();

    if (!name) {
      return res.status(400).json({ ok: false, error: 'Аты-жөніңізді жазыңыз' });
    }
    if (!['келемін', 'жұбыммен келемін', 'келе алмаймын'].includes(response)) {
      return res.status(400).json({ ok: false, error: 'Жауап форматы дұрыс емес' });
    }

    const workbook = await loadOrCreateWorkbook();
    const sheet = workbook.getWorksheet('Қонақтар');
    const id = sheet.rowCount;

    const ts = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' });
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();

    sheet.addRow({ id, timestamp: ts, name, response, ip });
    const lastRow = sheet.lastRow;
    lastRow.alignment = { vertical: 'middle' };
    let fillColor = 'FFF5D5D5';
    if (response === 'келемін') fillColor = 'FFD4E8C8';
    else if (response === 'жұбыммен келемін') fillColor = 'FFB8DDB0';
    lastRow.getCell('response').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillColor },
    };

    await workbook.xlsx.writeFile(XLSX_PATH);
    return res.json({ ok: true });
  } catch (err) {
    console.error('RSVP error:', err);
    return res.status(500).json({ ok: false, error: 'Қате болды, кейінірек қайталаңыз' });
  }
});

app.get('/api/rsvp/list', async (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).send('Forbidden');
  if (!fs.existsSync(XLSX_PATH)) return res.json({ rows: [] });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);
  const sheet = workbook.getWorksheet('Қонақтар');
  const rows = [];
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    rows.push({
      id: row.getCell(1).value,
      timestamp: row.getCell(2).value,
      name: row.getCell(3).value,
      response: row.getCell(4).value,
    });
  });
  res.json({ rows });
});

app.get('/api/rsvp/download', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).send('Forbidden');
  if (!fs.existsSync(XLSX_PATH)) return res.status(404).send('Файл табылмады');
  res.download(XLSX_PATH, 'akbota-rsvp.xlsx');
});

app.get('/admin', (req, res) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(403).send(`
      <html><head><meta charset="utf-8"><title>Қатынау жоқ</title></head>
      <body style="font-family: system-ui; padding: 40px; text-align: center;">
        <h2>Қатынау үшін кілт қажет</h2>
        <p>URL форматы: <code>/admin?key=ВАШ_КЛЮЧ</code></p>
      </body></html>
    `);
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Сайт іске қосылды: http://localhost:${PORT}`);
  console.log(`Админ панелі: http://localhost:${PORT}/admin?key=${ADMIN_KEY}`);
});
