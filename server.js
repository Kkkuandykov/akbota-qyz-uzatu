const express = require('express');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'akbota2026';

const DATA_DIR = path.join(__dirname, 'data');
const XLSX_PATH = path.join(DATA_DIR, 'rsvp.xlsx');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const HEADERS = ['№', 'Күні мен уақыты', 'Аты-жөні', 'Жауап', 'IP', 'Жағдайы', 'Адам саны'];
const COL_WIDTHS = [6, 22, 35, 22, 18, 14, 12];
const VALID_RESPONSES = ['келемін', 'жұбыммен келемін', 'келе алмаймын'];

function ensureSheetSchema(sheet) {
  for (let i = 0; i < HEADERS.length; i++) {
    const col = sheet.getColumn(i + 1);
    if (!col.header) col.header = HEADERS[i];
    col.width = COL_WIDTHS[i];
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF8B6F47' },
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    if (!row.getCell(6).value) row.getCell(6).value = 'active';
    if (!row.getCell(7).value) {
      const r = row.getCell(4).value;
      row.getCell(7).value = r === 'жұбыммен келемін' ? 2 : 1;
    }
  });
}

async function loadOrCreateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  if (fs.existsSync(XLSX_PATH)) {
    await workbook.xlsx.readFile(XLSX_PATH);
    let sheet = workbook.getWorksheet('Қонақтар');
    if (!sheet) sheet = workbook.addWorksheet('Қонақтар', { properties: { defaultRowHeight: 22 } });
    ensureSheetSchema(sheet);
    return workbook;
  }
  const sheet = workbook.addWorksheet('Қонақтар', { properties: { defaultRowHeight: 22 } });
  ensureSheetSchema(sheet);
  await workbook.xlsx.writeFile(XLSX_PATH);
  return workbook;
}

function colorForResponse(response) {
  if (response === 'келемін') return 'FFD4E8C8';
  if (response === 'жұбыммен келемін') return 'FFB8DDB0';
  return 'FFF5D5D5';
}

async function getAllRows() {
  if (!fs.existsSync(XLSX_PATH)) return [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);
  const sheet = workbook.getWorksheet('Қонақтар');
  if (!sheet) return [];
  const rows = [];
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    const id = row.getCell(1).value;
    if (id == null || id === '') return;
    const response = row.getCell(4).value;
    rows.push({
      id,
      timestamp: row.getCell(2).value,
      name: row.getCell(3).value,
      response,
      status: row.getCell(6).value || 'active',
      count: Number(row.getCell(7).value) || (response === 'жұбыммен келемін' ? 2 : 1),
    });
  });
  return rows;
}

async function updateRow(id, changes) {
  if (!fs.existsSync(XLSX_PATH)) return false;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);
  const sheet = workbook.getWorksheet('Қонақтар');
  if (!sheet) return false;
  let updated = false;
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    if (String(row.getCell(1).value) === String(id)) {
      if ('status' in changes) {
        row.getCell(6).value = changes.status;
        if (changes.status === 'archived') {
          row.font = { color: { argb: 'FF999999' }, italic: true };
        } else {
          row.font = { color: { argb: 'FF000000' }, italic: false };
        }
      }
      if ('count' in changes) {
        row.getCell(7).value = Math.max(0, Math.min(50, Number(changes.count) || 1));
      }
      updated = true;
    }
  });
  if (updated) await workbook.xlsx.writeFile(XLSX_PATH);
  return updated;
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch (e) {}
  return { capacity: 0 };
}

function saveSettings(s) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2));
}

function requireAdmin(req, res, next) {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ ok: false, error: 'Forbidden' });
  next();
}

async function appendGuest({ name, response, ip, count, source = 'self' }) {
  const workbook = await loadOrCreateWorkbook();
  const sheet = workbook.getWorksheet('Қонақтар');
  const id = sheet.rowCount;
  const ts = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' });
  const finalCount = count != null
    ? Math.max(0, Math.min(50, Number(count)))
    : (response === 'жұбыммен келемін' ? 2 : 1);
  sheet.addRow([id, ts, name, response, ip, 'active', finalCount]);
  const lastRow = sheet.lastRow;
  lastRow.alignment = { vertical: 'middle' };
  lastRow.getCell(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: colorForResponse(response) },
  };
  await workbook.xlsx.writeFile(XLSX_PATH);
  return { id, count: finalCount };
}

app.post('/api/rsvp', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 200);
    const response = String(req.body.response || '').trim();

    if (!name) return res.status(400).json({ ok: false, error: 'Аты-жөніңізді жазыңыз' });
    if (!VALID_RESPONSES.includes(response)) {
      return res.status(400).json({ ok: false, error: 'Жауап форматы дұрыс емес' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    await appendGuest({ name, response, ip });
    return res.json({ ok: true });
  } catch (err) {
    console.error('RSVP error:', err);
    return res.status(500).json({ ok: false, error: 'Қате болды, кейінірек қайталаңыз' });
  }
});

app.get('/api/rsvp/list', requireAdmin, async (req, res) => {
  const rows = await getAllRows();
  const settings = loadSettings();
  res.json({ rows, settings });
});

app.post('/api/rsvp/add', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 200);
    const response = String(req.body.response || '').trim();
    const count = Number(req.body.count) || 1;
    if (!name) return res.status(400).json({ ok: false, error: 'Аты-жөні қажет' });
    if (!VALID_RESPONSES.includes(response)) {
      return res.status(400).json({ ok: false, error: 'Жауап форматы дұрыс емес' });
    }
    const result = await appendGuest({ name, response, ip: 'admin', count, source: 'admin' });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Add error:', err);
    res.status(500).json({ ok: false, error: 'Қате болды' });
  }
});

app.post('/api/rsvp/update', requireAdmin, async (req, res) => {
  const id = req.body && req.body.id;
  if (id == null) return res.status(400).json({ ok: false, error: 'id required' });
  const changes = {};
  if ('count' in req.body) changes.count = req.body.count;
  if ('status' in req.body) changes.status = req.body.status;
  const ok = await updateRow(id, changes);
  res.json({ ok });
});

app.post('/api/rsvp/archive', requireAdmin, async (req, res) => {
  const id = req.body && req.body.id;
  if (id == null) return res.status(400).json({ ok: false, error: 'id required' });
  const ok = await updateRow(id, { status: 'archived' });
  res.json({ ok });
});

app.post('/api/rsvp/restore', requireAdmin, async (req, res) => {
  const id = req.body && req.body.id;
  if (id == null) return res.status(400).json({ ok: false, error: 'id required' });
  const ok = await updateRow(id, { status: 'active' });
  res.json({ ok });
});

app.get('/api/settings', requireAdmin, (req, res) => {
  res.json({ settings: loadSettings() });
});

app.post('/api/settings', requireAdmin, (req, res) => {
  const capacity = Math.max(0, Math.min(10000, Number(req.body.capacity) || 0));
  const s = loadSettings();
  s.capacity = capacity;
  saveSettings(s);
  res.json({ ok: true, settings: s });
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
      <body style="font-family: -apple-system, system-ui; padding: 40px; text-align: center;">
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
