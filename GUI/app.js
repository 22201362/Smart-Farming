const sUrl = 'https://errxdztrkixpkzfnwwbv.supabase.co';
const sKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVycnhkenRya2l4cGt6Zm53d2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDIyMDYsImV4cCI6MjA4OTQxODIwNn0.bomphvwKnu8o6i05FnfS8t1W_D8b2mw_JsJ2obglyPU';


const { createClient } = supabase;
const db = createClient(sUrl, sKey);

let curUser = null;
let rowCache = {};
let pageRows = {};

const el  = id => document.getElementById(id);
const all = sel => document.querySelectorAll(sel);


function notify(msg, type) {
  const t = el('toast');
  t.textContent = msg;
  t.className = `toast ${type === 'err' ? 'toast-err' : 'toast-ok'}`;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3200);
}


function openModal(title, bodyHtml, footerHtml) {
  el('modal-title').textContent = title;
  el('modal-alert').innerHTML = '';
  el('modal-body').innerHTML = bodyHtml;
  el('modal-footer').innerHTML = footerHtml;
  el('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  el('modal-overlay').classList.add('hidden');
  el('modal-body').innerHTML = '';
  el('modal-alert').innerHTML = '';
}

el('modal-overlay').addEventListener('click', e => {
  if (e.target === el('modal-overlay')) closeModal();
});


async function fetchAll(tbl) {
  const { data, error } = await db.from(tbl).select('*');
  if (error) throw error;
  return data || [];
}

async function insertRow(tbl, row) {
  const clean = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const { data, error } = await db.from(tbl).insert([clean]).select();
  if (error) throw error;
  return data;
}

async function updateRow(tbl, pk, id, row) {
  const clean = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );
  const { data, error } = await db.from(tbl).update(clean).eq(pk, id).select();
  if (error) throw error;
  return data;
}

async function deleteRow(tbl, pk, id) {
  const { error } = await db.from(tbl).delete().eq(pk, id);
  if (error) throw error;
}


function fmtVal(val, col) {
  if (val === null || val === undefined || val === '')
    return '<span style="color:var(--muted-lt)">—</span>';
  if ((col || '').includes('date') || (col || '').includes('timestamp'))
    return String(val).slice(0, 16).replace('T', ' ');
  return String(val);
}

function mkBadge(s) {
  if (!s) return '<span class="badge badge-gray">—</span>';
  const v = s.toLowerCase();
  if (v.includes('active') || v.includes('online') || v.includes('ok'))
    return `<span class="badge badge-green">${s}</span>`;
  if (v.includes('inactive') || v.includes('offline') || v.includes('broken'))
    return `<span class="badge badge-red">${s}</span>`;
  if (v.includes('maintenance') || v.includes('idle') || v.includes('pending'))
    return `<span class="badge badge-amber">${s}</span>`;
  return `<span class="badge badge-gray">${s}</span>`;
}

function getInitials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}


el('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  el('login-msg').innerHTML = '<div class="alert alert-success">Signing in...</div>';

  const email = el('inp-email').value.trim();
  const pass  = el('inp-pass').value;

  try {
    const { data, error } = await db
      .from('users')
      .select('*, user_groups(name)')
      .eq('email', email)
      .eq('password', pass)
      .limit(1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Invalid email or password');

    curUser = data[0];
    showApp();
  } catch (err) {
    el('login-msg').innerHTML = `<div class="alert alert-error">✗ ${err.message}</div>`;
  }
});


function showApp() {
  el('login-page').classList.add('hidden');
  el('app-page').classList.remove('hidden');

  const grp = (curUser.user_groups?.name || '').toLowerCase();
  el('user-name').textContent   = curUser.name || 'User';
  el('user-role').textContent   = curUser.user_groups?.name || 'User';
  el('user-avatar').textContent = getInitials(curUser.name);

  if (grp === 'admin') {
    all('.admin-only').forEach(n => n.classList.remove('hidden'));
  }

  all('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.page));
  });

  el('logout-btn').addEventListener('click', () => {
    curUser = null;
    el('app-page').classList.add('hidden');
    el('login-page').classList.remove('hidden');
    el('inp-email').value = '';
    el('inp-pass').value  = '';
    el('login-msg').innerHTML = '';
    all('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-page="dashboard"]').classList.add('active');
  });

  goTo('dashboard');
}

function goTo(page) {
  all('.nav-btn[data-page]').forEach(b => b.classList.remove('active'));
  const active = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (active) active.classList.add('active');

  const routes = {
    dashboard: loadDashboard,
    farms:     () => loadTable('farms'),
    fields:    () => loadTable('fields'),
    crops:     () => loadTable('crops'),
    plantings: () => loadTable('plantings'),
    sensors:   () => loadTable('sensors'),
    readings:  () => loadTable('readings'),
    equipment: () => loadTable('equipment'),
    users:     () => loadTable('users'),
    groups:    () => loadTable('groups'),
  };

  (routes[page] || loadDashboard)();
}


function setHeader(title, sub, actionHtml) {
  el('page-title').textContent  = title;
  el('page-sub').textContent    = sub || '';
  el('page-action').innerHTML   = actionHtml || '';
}

function setBody(html) {
  el('page-body').innerHTML = html;
}


async function loadDashboard() {
  setHeader('Dashboard', `Welcome, ${curUser?.name || 'User'}`, '');
  setBody('<div class="loading-msg">Loading...</div>');

  try {
    const [farms, fields, plantings, sensors, readings, equipment] = await Promise.all([
      fetchAll('farms'),
      fetchAll('fields'),
      fetchAll('plantings'),
      fetchAll('sensors'),
      fetchAll('sensor_readings'),
      fetchAll('equipment'),
    ]);

    function buildStat(num, label, iconPath, iconBg, iconColor, tagText, tagClass) {
      return `
        <div class="stat-card">
          <div class="stat-top">
            <div class="stat-icon" style="background:${iconBg}">
              <svg viewBox="0 0 24 24" style="stroke:${iconColor}">${iconPath}</svg>
            </div>
            <span class="stat-tag ${tagClass}">${tagText}</span>
          </div>
          <div class="stat-number">${num}</div>
          <div class="stat-label">${label}</div>
        </div>`;
    }

    function buildMiniTable(title, headers, rows) {
      const ths = headers.map(h => `<th>${h}</th>`).join('');
      const trs = rows.length
        ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" class="empty-state"><p>No data yet</p></td></tr>`;
      return `
        <div class="table-card">
          <div class="table-card-head"><span class="table-card-title">${title}</span></div>
          <div class="table-scroll">
            <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
          </div>
        </div>`;
    }

    const recentPlantings = plantings.slice(0, 5).map(r => [
      `<span class="id-label">#${r.planting_id}</span>`,
      `Field #${r.field_id}`,
      `Crop #${r.crop_id}`,
      fmtVal(r.planting_date, 'date'),
      fmtVal(r.harvest_date, 'date'),
    ]);

    const recentReadings = readings.slice(0, 5).map(r => [
      `<span class="id-label">#${r.reading_id}</span>`,
      `Sensor #${r.sensor_id}`,
      r.value,
      fmtVal(r.timestamp, 'timestamp'),
    ]);

    const farmRows = farms.slice(0, 4).map(r => [
      `<span class="id-label">#${r.farm_id}</span>`, r.name, r.location
    ]);

    const equipRows = equipment.slice(0, 4).map(r => [
      `<span class="id-label">#${r.equipment_id}</span>`, r.name,
      `Farm #${r.farm_id}`, mkBadge(r.status)
    ]);

    setBody(`
      <div class="stats-row">
        ${buildStat(farms.length,     'Total Farms',
          '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
          '#f0fdf4', '#166534', 'Registered', 'badge badge-green')}
        ${buildStat(fields.length,    'Fields',
          '<path d="M3 17l4-8 4 4 4-6 4 10"/><path d="M3 21h18"/>',
          '#dbeafe', '#1d4ed8', 'Active', 'badge badge-blue')}
        ${buildStat(plantings.length, 'Plantings',
          '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3"/>',
          '#fef3c7', '#92400e', 'This season', 'badge badge-amber')}
        ${buildStat(sensors.length,   'Sensors',
          '<path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><circle cx="12" cy="20" r="1" fill="#166534"/>',
          '#f0fdf4', '#166534', 'Online', 'badge badge-green')}
      </div>
      <div class="two-col">
        ${buildMiniTable('Recent Plantings', ['ID','Field','Crop','Planted','Harvest'], recentPlantings)}
        ${buildMiniTable('Latest Sensor Readings', ['ID','Sensor','Value','Timestamp'], recentReadings)}
      </div>
      <div class="two-col">
        ${buildMiniTable('Farms', ['ID','Name','Location'], farmRows)}
        ${buildMiniTable('Equipment', ['ID','Name','Farm','Status'], equipRows)}
      </div>
    `);

  } catch (err) {
    setBody(`<div class="alert alert-error">✗ ${err.message}</div>`);
  }
}


const tables = {
  farms: {
    label: 'Farms',           sub: 'Manage your registered farms',
    tbl: 'farms',             pk: 'farm_id',
    heads: ['ID','Farm Name','Location','Owner (User ID)','Actions'],
    cols:  ['farm_id','name','location','user_id'],
    fields: [
      { n:'name',    l:'Farm Name',       t:'text',  req:true },
      { n:'location',l:'Location',        t:'text',  req:true },
      { n:'user_id', l:'Owner (User ID)', t:'number',req:true },
    ]
  },
  fields: {
    label: 'Fields',          sub: 'Manage fields across your farms',
    tbl: 'fields',            pk: 'field_id',
    heads: ['ID','Farm ID','Size (ha)','Soil Type','Actions'],
    cols:  ['field_id','farm_id','size','soil_type'],
    fields: [
      { n:'farm_id',  l:'Farm ID',   t:'number',req:true },
      { n:'size',     l:'Size (ha)', t:'number',req:true },
      { n:'soil_type',l:'Soil Type', t:'text',  ph:'Clay, Sandy, Loam...' },
    ]
  },
  crops: {
    label: 'Crops',           sub: 'Manage crop types',
    tbl: 'crops',             pk: 'crop_id',
    heads: ['ID','Crop Name','Season','Actions'],
    cols:  ['crop_id','name','season'],
    fields: [
      { n:'name',  l:'Crop Name',t:'text',req:true },
      { n:'season',l:'Season',   t:'text',ph:'Summer, Winter, All-year...' },
    ]
  },
  plantings: {
    label: 'Plantings',       sub: 'Track all planting records',
    tbl: 'plantings',         pk: 'planting_id',
    heads: ['ID','Field ID','Crop ID','Planting Date','Harvest Date','Actions'],
    cols:  ['planting_id','field_id','crop_id','planting_date','harvest_date'],
    fields: [
      { n:'field_id',     l:'Field ID',        t:'number',req:true },
      { n:'crop_id',      l:'Crop ID',          t:'number',req:true },
      { n:'planting_date',l:'Planting Date',    t:'date',  req:true },
      { n:'harvest_date', l:'Expected Harvest', t:'date'   },
    ]
  },
  sensors: {
    label: 'Sensors',         sub: 'Manage IoT sensors across your fields',
    tbl: 'sensors',           pk: 'sensor_id',
    heads: ['ID','Field ID','Type','Unit','Actions'],
    cols:  ['sensor_id','field_id','type','unit'],
    fields: [
      { n:'field_id',l:'Field ID',    t:'number',req:true },
      { n:'type',    l:'Sensor Type', t:'text',  req:true,ph:'Temperature, Humidity, Soil Moisture...' },
      { n:'unit',    l:'Unit',        t:'text',  ph:'°C, %, hPa...' },
    ]
  },
  readings: {
    label: 'Sensor Readings', sub: 'All sensor data logs',
    tbl: 'sensor_readings',   pk: 'reading_id',
    heads: ['ID','Sensor ID','Value','Timestamp','Actions'],
    cols:  ['reading_id','sensor_id','value','timestamp'],
    fields: [
      { n:'sensor_id',l:'Sensor ID', t:'number',        req:true },
      { n:'value',    l:'Value',     t:'number',        req:true },
      { n:'timestamp',l:'Timestamp', t:'datetime-local' },
    ]
  },
  equipment: {
    label: 'Equipment',       sub: 'Manage farm equipment',
    tbl: 'equipment',         pk: 'equipment_id',
    heads: ['ID','Farm ID','Name','Status','Actions'],
    cols:  ['equipment_id','farm_id','name','status'],
    fields: [
      { n:'farm_id',l:'Farm ID',t:'number',req:true },
      { n:'name',   l:'Name',   t:'text',  req:true },
      { n:'status', l:'Status', t:'text',  ph:'Active, Maintenance, Inactive...' },
    ]
  },
  users: {
    label: 'Users',           sub: 'Manage system user accounts',
    tbl: 'users',             pk: 'user_id',
    heads: ['ID','Name','Email','Group ID','Actions'],
    cols:  ['user_id','name','email','group_id'],
    fields: [
      { n:'name',    l:'Full Name',t:'text',    req:true },
      { n:'email',   l:'Email',    t:'email',   req:true },
      { n:'password',l:'Password', t:'password',req:true },
      { n:'group_id',l:'Group ID', t:'number' },
    ]
  },
  groups: {
    label: 'User Groups',     sub: 'Manage roles and permissions',
    tbl: 'user_groups',       pk: 'group_id',
    heads: ['ID','Group Name','Actions'],
    cols:  ['group_id','name'],
    fields: [
      { n:'name',l:'Group Name',t:'text',req:true,ph:'Admin, Employee, Technician...' },
    ]
  },
};


async function loadTable(key) {
  const cfg  = tables[key];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;

  setHeader(cfg.label, cfg.sub, `
    <button class="btn btn-green" onclick="openAdd('${key}')">
      <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Add ${sing}
    </button>`);

  setBody('<div class="loading-msg">Loading...</div>');

  try {
    const rows = await fetchAll(cfg.tbl);
    rowCache[key] = {};
    rows.forEach(r => { rowCache[key][r[cfg.pk]] = r; });
    pageRows[key] = rows;
    drawTable(key, rows);
  } catch (err) {
    setBody(`<div class="alert alert-error">✗ ${err.message}</div>`);
  }
}


function drawTable(key, rows) {
  const cfg  = tables[key];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;

  const headHtml = cfg.heads.map(h => `<th>${h}</th>`).join('');

  let bodyHtml;
  if (rows.length === 0) {
    bodyHtml = `
      <tr>
        <td colspan="${cfg.heads.length}" class="empty-state">
          <p>No ${cfg.label.toLowerCase()} found</p>
          <button class="btn btn-green" style="margin:0 auto" onclick="openAdd('${key}')">
            Add First Record
          </button>
        </td>
      </tr>`;
  } else {
    bodyHtml = rows.map(r => {
      const cells = cfg.cols.map(col => {
        const v = r[col];
        if (col === cfg.pk)     return `<td><span class="id-label">#${v}</span></td>`;
        if (col === 'status')   return `<td>${mkBadge(v)}</td>`;
        if (col === 'group_id') return `<td>${v ? `<span class="badge badge-blue">#${v}</span>` : '<span style="color:var(--muted-lt)">—</span>'}</td>`;
        return `<td>${fmtVal(v, col)}</td>`;
      }).join('');

      return `
        <tr>
          ${cells}
          <td>
            <div class="row-actions">
              <button class="row-edit-btn" onclick="openEdit('${key}', ${r[cfg.pk]})">Edit</button>
              <button class="row-del-btn"  onclick="openDel('${key}', '${cfg.pk}', ${r[cfg.pk]})">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  setBody(`
    <div class="table-card">
      <div class="table-card-head">
        <span class="table-card-title">All ${cfg.label}</span>
        <div class="table-card-right">
          <span class="record-count" id="rc-${key}">${rows.length} record${rows.length !== 1 ? 's' : ''}</span>
          <input class="search-input" placeholder="Search..." oninput="filterTable(this.value, '${key}')">
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody id="tb-${key}">${bodyHtml}</tbody>
        </table>
      </div>
    </div>`);
}


function filterTable(q, key) {
  const cfg  = tables[key];
  const rows = pageRows[key] || [];
  const hits = q.trim()
    ? rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q.toLowerCase())))
    : rows;

  const tb = el(`tb-${key}`);
  const rc = el(`rc-${key}`);
  if (rc) rc.textContent = `${hits.length} record${hits.length !== 1 ? 's' : ''}`;
  if (!tb) return;

  if (!hits.length) {
    tb.innerHTML = `<tr><td colspan="${cfg.heads.length}" class="empty-state"><p>No results for "${q}"</p></td></tr>`;
    return;
  }

  tb.innerHTML = hits.map(r => {
    const cells = cfg.cols.map(col => {
      const v = r[col];
      if (col === cfg.pk)     return `<td><span class="id-label">#${v}</span></td>`;
      if (col === 'status')   return `<td>${mkBadge(v)}</td>`;
      if (col === 'group_id') return `<td>${v ? `<span class="badge badge-blue">#${v}</span>` : '<span style="color:var(--muted-lt)">—</span>'}</td>`;
      return `<td>${fmtVal(v, col)}</td>`;
    }).join('');

    return `
      <tr>
        ${cells}
        <td>
          <div class="row-actions">
            <button class="row-edit-btn" onclick="openEdit('${key}', ${r[cfg.pk]})">Edit</button>
            <button class="row-del-btn"  onclick="openDel('${key}', '${cfg.pk}', ${r[cfg.pk]})">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}


function buildFormFields(cfg, data) {
  data = data || {};
  return cfg.fields.map(f => {
    const val = (data[f.n] !== undefined && data[f.n] !== null)
      ? String(data[f.n]).replace(/"/g, '&quot;')
      : '';
    return `
      <div class="field-group">
        <label>${f.l}${f.req ? '<span class="req"> *</span>' : ''}</label>
        <input
          name="${f.n}"
          type="${f.t}"
          value="${f.t === 'password' ? '' : val}"
          placeholder="${f.ph || ''}"
          ${f.req ? 'required' : ''}
          ${f.t === 'password' ? 'autocomplete="new-password"' : ''}>
      </div>`;
  }).join('');
}

function readFormValues(cfg) {
  const form = el('modal-box').querySelector('form');
  const row  = {};
  cfg.fields.forEach(f => {
    const v = form[f.n]?.value;
    if (f.t === 'password') { if (v) row[f.n] = v; return; }
    if (v === '' || v === null || v === undefined) return;
    row[f.n] = f.t === 'number' ? Number(v) : v;
  });
  return row;
}


function openAdd(key) {
  const cfg  = tables[key];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;

  openModal(
    `Add ${sing}`,
    `<form id="modal-form">${buildFormFields(cfg)}</form>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
     <button class="btn btn-green" onclick="submitAdd('${key}')">Save Record</button>`
  );

  el('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitAdd(key);
  });
}

async function submitAdd(key) {
  const cfg  = tables[key];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;
  const row  = readFormValues(cfg);

  try {
    await insertRow(cfg.tbl, row);
    closeModal();
    notify(`${sing} added successfully`);
    await loadTable(key);
  } catch (err) {
    el('modal-alert').innerHTML = `<div class="alert alert-error">✗ ${err.message}</div>`;
  }
}


function openEdit(key, id) {
  const cfg  = tables[key];
  const data = (rowCache[key] || {})[id];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;

  if (!data) { notify('Record not found', 'err'); return; }

  openModal(
    `Edit ${sing}`,
    `<form id="modal-form">${buildFormFields(cfg, data)}</form>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
     <button class="btn btn-green" onclick="submitEdit('${key}', ${id})">Update Record</button>`
  );

  el('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitEdit(key, id);
  });
}

async function submitEdit(key, id) {
  const cfg  = tables[key];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;
  const row  = readFormValues(cfg);

  try {
    await updateRow(cfg.tbl, cfg.pk, id, row);
    closeModal();
    notify(`${sing} updated`);
    await loadTable(key);
  } catch (err) {
    el('modal-alert').innerHTML = `<div class="alert alert-error">✗ ${err.message}</div>`;
  }
}


function openDel(key, pk, id) {
  const cfg  = tables[key];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;

  openModal(
    `Delete ${sing}`,
    `<p style="color:var(--muted);font-size:13px;line-height:1.7">
       Are you sure you want to permanently delete<br>
       <strong style="color:var(--text)">${sing} #${id}</strong>?
       This action cannot be undone.
     </p>`,
    `<button class="btn btn-outline" onclick="closeModal()">Cancel</button>
     <button class="btn btn-red" onclick="confirmDelete('${key}', '${pk}', ${id})">Delete</button>`
  );
}

async function confirmDelete(key, pk, id) {
  const cfg  = tables[key];
  const sing = cfg.label.endsWith('s') ? cfg.label.slice(0, -1) : cfg.label;

  try {
    await deleteRow(cfg.tbl, pk, id);
    closeModal();
    notify('Record deleted');
    await loadTable(key);
  } catch (err) {
    el('modal-alert').innerHTML = `<div class="alert alert-error">✗ ${err.message}</div>`;
  }
}
