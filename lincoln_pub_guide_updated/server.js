
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Nugget';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-in-production';
const DATA_FILE = path.join(__dirname, 'data', 'venues.json');

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 12
  }
}));

app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

function readVenues() {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeVenues(venues) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(venues, null, 2), 'utf8');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Unauthorised' });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/venues', (req, res) => {
  const venues = readVenues();
  const city = (req.query.city || '').trim().toLowerCase();
  const status = (req.query.status || '').trim().toLowerCase();
  const collection = (req.query.collection || '').trim().toLowerCase();
  const category = (req.query.category || '').trim().toLowerCase();
  const q = (req.query.q || '').trim().toLowerCase();

  const filtered = venues.filter(v => {
    const cityOk = !city || v.city.toLowerCase() === city;
    const statusOk = !status || v.status.toLowerCase() === status;
    const collectionOk = !collection || (v.area || '').toLowerCase() === collection;
    const categoryOk = !category || (v.category || '').toLowerCase() === category;
    const hay = `${v.name} ${v.city} ${v.area || ''} ${v.location || ''} ${v.description || ''} ${v.suburb || ''}`.toLowerCase();
    const qOk = !q || hay.includes(q);
    return cityOk && statusOk && collectionOk && categoryOk && qOk;
  });

  res.json({ items: filtered, total: filtered.length });
});

app.get('/api/meta', (req, res) => {
  const venues = readVenues();
  const cities = [...new Set(venues.map(v => v.city))].sort();
  const collections = [...new Set(venues.map(v => v.area).filter(Boolean))].sort();
  const categories = [...new Set(venues.map(v => v.category).filter(Boolean))].sort();
  res.json({
    cities,
    collections,
    categories,
    counts: {
      total: venues.length,
      visited: venues.filter(v => v.status === 'Visited').length,
      wishlist: venues.filter(v => v.status === 'Wishlist').length
    }
  });
});

app.post('/api/admin/login', (req, res) => {
  const password = req.body.password || '';
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.get('/api/admin/venues', requireAdmin, (req, res) => {
  res.json({ items: readVenues() });
});

app.put('/api/admin/venues/:id/status', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = req.body.status;
  if (!['Visited', 'Wishlist'].includes(status)) {
    return res.status(400).json({ error: 'Bad status' });
  }
  const venues = readVenues();
  const idx = venues.findIndex(v => Number(v.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  venues[idx].status = status;
  writeVenues(venues);
  res.json({ item: venues[idx] });
});

app.post('/api/admin/venues', requireAdmin, (req, res) => {
  const venues = readVenues();
  const maxId = venues.reduce((m, v) => Math.max(m, Number(v.id) || 0), 0);
  const item = {
    id: maxId + 1,
    name: req.body.name || 'Untitled venue',
    city: req.body.city || 'Unknown',
    area: req.body.area || 'General',
    category: req.body.category || 'Venue',
    status: req.body.status || 'Wishlist',
    location: req.body.location || '',
    suburb: req.body.suburb || '',
    description: req.body.description || ''
  };
  venues.push(item);
  writeVenues(venues);
  res.status(201).json({ item });
});

app.put('/api/admin/venues/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const venues = readVenues();
  const idx = venues.findIndex(v => Number(v.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  venues[idx] = {
    ...venues[idx],
    name: req.body.name ?? venues[idx].name,
    city: req.body.city ?? venues[idx].city,
    area: req.body.area ?? venues[idx].area,
    category: req.body.category ?? venues[idx].category,
    status: req.body.status ?? venues[idx].status,
    location: req.body.location ?? venues[idx].location,
    suburb: req.body.suburb ?? venues[idx].suburb,
    description: req.body.description ?? venues[idx].description,
  };
  writeVenues(venues);
  res.json({ item: venues[idx] });
});

app.delete('/api/admin/venues/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const venues = readVenues();
  const next = venues.filter(v => Number(v.id) !== id);
  if (next.length === venues.length) return res.status(404).json({ error: 'Not found' });
  writeVenues(next);
  res.json({ ok: true });
});

app.post('/api/admin/import', requireAdmin, (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  writeVenues(items);
  res.json({ ok: true, total: items.length });
});

app.get('/api/admin/export', requireAdmin, (req, res) => {
  res.json({ items: readVenues() });
});

app.listen(PORT, () => {
  console.log(`Pub Guide running on http://localhost:${PORT}`);
});
