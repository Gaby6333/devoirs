var firebaseConfig = {
  apiKey: "AIzaSyCBOTYxfW0x6HyK0YZECwTxUr81oI0YuQ4",
  authDomain: "devoirs-55a7f.firebaseapp.com",
  projectId: "devoirs-55a7f",
  storageBucket: "devoirs-55a7f.firebasestorage.app",
  messagingSenderId: "589504609242",
  appId: "1:589504609242:web:b8fab2fba6eee0e9859ee3"
};
firebase.initializeApp(firebaseConfig);
firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(function () {});
var col = firebase.firestore().collection('devoirs');
var coursesCol = firebase.firestore().collection('cours');

var items = [];
var courses = [];
var myName = localStorage.getItem('devoirs-name') || '';
var filter = 'tous';
var editingId = null;
var showDone = false;
var searchQuery = '';
var sortBy = 'date';
var KNOWN_NAMES = ['Léonie', 'Gabriel'];

var currentTheme = localStorage.getItem('devoirs-theme') || 'auto';
if (currentTheme === 'light' || currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', currentTheme);
}

var STATUS = {
  a_faire: { label: 'À faire' },
  en_cours: { label: 'En cours' },
  fini: { label: 'Fini' }
};

var TYPES = {
  devoir: { label: 'Devoir', icon: '📝' },
  examen: { label: 'Examen', icon: '🎯' },
  lecture: { label: 'Lecture', icon: '📖' },
  projet: { label: "Projet d'équipe", icon: '👥' }
};

var AVATAR_COLORS = ['#2b4c7e', '#6e4b8a', '#2e7d74', '#a15c34', '#55606b', '#7a4356'];
var NAME_COLORS = { 'Léonie': '#3d7a56', 'Gabriel': '#6e4b8a' };
var SUBJECT_COLORS = ['#2b4c7e', '#6e4b8a', '#2e7d74', '#a15c34', '#55606b', '#7a4356', '#1f6f8b', '#8a6d1f'];

function avatarColor(name) {
  if (NAME_COLORS[name]) return NAME_COLORS[name];
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function subjectColor(name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = (hash * 17 + name.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

function initials(name) {
  return (name || '?').trim().slice(0, 2).toUpperCase();
}

function showBanner(text) {
  var b = document.getElementById('banner');
  b.textContent = text;
  b.classList.add('show');
}

function hideBanner() {
  document.getElementById('banner').classList.remove('show');
}

col.onSnapshot(function (snap) {
  items = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  hideBanner();
  render();
}, function (err) {
  showBanner("Connexion à la base de données perdue — recharge la page.");
});

coursesCol.onSnapshot(function (snap) {
  courses = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
  if (document.getElementById('panel').classList.contains('open')) renderSubjectSelect();
});

function addDevoir(data) {
  data.createdAt = new Date().toISOString();
  data.createdBy = myName;
  col.add(data).catch(function () {
    showBanner("Échec de l'enregistrement — vérifie ta connexion et réessaie.");
  });
}

function updateDevoir(id, data) {
  data.updatedAt = new Date().toISOString();
  col.doc(id).update(data).catch(function () {
    showBanner("Échec de la mise à jour — vérifie ta connexion et réessaie.");
  });
}

function deleteDevoir(id) {
  col.doc(id).delete().catch(function () {
    showBanner("Échec de la suppression — vérifie ta connexion et réessaie.");
  });
}

function dueInfo(iso) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var d = new Date(iso + 'T00:00:00');
  var diff = Math.round((d - today) / 86400000);
  var text, cls;
  if (diff < 0) { text = 'En retard ' + (-diff) + ' j'; cls = 'overdue'; }
  else if (diff === 0) { text = "Aujourd'hui"; cls = 'overdue'; }
  else if (diff === 1) { text = 'Demain'; cls = 'overdue'; }
  else if (diff === 2) { text = 'Dans 2 j'; cls = 'soon'; }
  else { text = 'Dans ' + diff + ' j'; cls = ''; }
  var abs = d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
  return { text: text, cls: cls, abs: abs, diff: diff };
}

function knownNames() {
  return KNOWN_NAMES.slice();
}

function renderWhoAmI() {
  document.getElementById('my-name').textContent = myName || '—';
  var av = document.getElementById('my-avatar');
  av.textContent = initials(myName);
  av.style.background = avatarColor(myName || '?');
}

function renderStats() {
  var todo = 0, late = 0, done = 0;
  items.forEach(function (it) {
    if (it.status === 'fini') { done++; return; }
    var info = dueInfo(it.dueDate);
    if (info.diff < 0) late++; else todo++;
  });
  document.getElementById('stat-todo').textContent = todo;
  document.getElementById('stat-late').textContent = late;
  document.getElementById('stat-done').textContent = done;
}

function renderChips() {
  var names = knownNames();
  var wrap = document.getElementById('chips');
  wrap.innerHTML = '';
  var all = ['tous'].concat(names);
  if (items.some(function (it) { return it.assignedTo === 'Nous deux'; })) all.push('Nous deux');
  all.forEach(function (name) {
    var btn = document.createElement('button');
    btn.className = 'chip' + (filter === name ? ' active' : '');
    btn.textContent = name === 'tous' ? 'Tous' : name;
    btn.onclick = function () { filter = name; render(); };
    wrap.appendChild(btn);
  });
}

function renderAssignRow() {
  var names = knownNames();
  var wrap = document.getElementById('assign-row');
  var current = wrap.getAttribute('data-value') || myName;
  wrap.innerHTML = '';
  var opts = names.slice();
  if (opts.indexOf(myName) === -1 && myName) opts.unshift(myName);
  opts.push('Nous deux');
  opts.forEach(function (name) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'assign-pick' + (current === name ? ' active' : '');
    btn.textContent = name;
    btn.onclick = function () {
      wrap.setAttribute('data-value', name);
      renderAssignRow();
      renderSubjectSelect();
    };
    wrap.appendChild(btn);
  });
}

function subjectOptionsFor(owner) {
  var set = {};
  courses.forEach(function (c) {
    if (c.owner === owner || c.owner === 'Nous deux') set[c.name] = true;
  });
  items.forEach(function (it) {
    if (it.subject && (it.assignedTo === owner || it.assignedTo === 'Nous deux')) set[it.subject] = true;
  });
  return Object.keys(set).sort();
}

function renderSubjectSelect() {
  var owner = document.getElementById('assign-row').getAttribute('data-value') || myName;
  var sel = document.getElementById('f-subject');
  var current = sel.getAttribute('data-current') || '';
  var options = subjectOptionsFor(owner);
  sel.innerHTML = '';
  var placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = options.length ? 'Choisir un cours' : 'Aucun cours encore';
  sel.appendChild(placeholder);
  options.forEach(function (name) {
    var opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === current) opt.selected = true;
    sel.appendChild(opt);
  });
  var addOpt = document.createElement('option');
  addOpt.value = '__new__';
  addOpt.textContent = '+ Nouveau cours...';
  sel.appendChild(addOpt);
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function icsTimestamp() {
  var d = new Date();
  return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' +
    pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
}

function escapeIcs(text) {
  return (text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function downloadIcs(it) {
  var typeLabel = TYPES[it.type] ? TYPES[it.type].label : 'Devoir';
  var summary = escapeIcs(typeLabel + ': ' + it.title + (it.subject ? ' (' + it.subject + ')' : ''));
  var desc = escapeIcs(it.description || '');
  var dateStr = it.dueDate.replace(/-/g, '');
  var lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Devoirs a deux//FR',
    'BEGIN:VEVENT',
    'UID:' + it.id + '@devoirs-a-deux',
    'DTSTAMP:' + icsTimestamp(),
    'DTSTART;VALUE=DATE:' + dateStr,
    'SUMMARY:' + summary,
    'DESCRIPTION:' + desc,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'devoir.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

function duplicateDevoir(it) {
  var d = new Date(it.dueDate + 'T00:00:00');
  d.setDate(d.getDate() + 7);
  addDevoir({
    title: it.title,
    type: it.type || 'devoir',
    subject: it.subject || '',
    dueDate: d.toISOString().slice(0, 10),
    weight: it.weight || null,
    duration: it.duration || '',
    description: it.description || '',
    assignedTo: it.assignedTo,
    status: 'a_faire'
  });
}

function makeCard(it) {
  var card = document.createElement('div');
  var info = dueInfo(it.dueDate);
  var stateCls = it.status === 'fini' ? 'fini' : info.cls;
  card.className = 'card card-enter' + (stateCls ? ' ' + stateCls : '');
  card.addEventListener('animationend', function () {
    card.classList.remove('card-enter');
  }, { once: true });

  var main = document.createElement('div');
  main.className = 'card-main';

  var top = document.createElement('div');
  top.className = 'card-top';

  var type = TYPES[it.type] ? it.type : 'devoir';
  var typeTag = document.createElement('span');
  typeTag.className = 'type-tag ' + type;
  typeTag.textContent = TYPES[type].icon + ' ' + TYPES[type].label;
  top.appendChild(typeTag);

  if (it.subject) {
    var color = subjectColor(it.subject);
    var tag = document.createElement('span');
    tag.className = 'subject-tag';
    tag.textContent = it.subject;
    tag.style.color = color;
    tag.style.background = color + '22';
    top.appendChild(tag);
  }
  var badge = document.createElement('span');
  badge.className = 'due-badge' + (info.cls ? ' ' + info.cls : '');
  badge.textContent = it.status === 'fini' ? info.abs : info.text + ' · ' + info.abs;
  top.appendChild(badge);
  if (it.weight) {
    var weightBadge = document.createElement('span');
    weightBadge.className = 'meta-badge';
    weightBadge.textContent = '⚖ ' + it.weight + '%';
    top.appendChild(weightBadge);
  }
  if (it.duration) {
    var durBadge = document.createElement('span');
    durBadge.className = 'meta-badge';
    durBadge.textContent = '⏱ ' + it.duration;
    top.appendChild(durBadge);
  }
  main.appendChild(top);

  var title = document.createElement('p');
  title.className = 'card-title';
  title.textContent = it.title;
  main.appendChild(title);

  if (it.description) {
    var desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = it.description;
    main.appendChild(desc);
  }

  card.appendChild(main);

  var side = document.createElement('div');
  side.className = 'card-side';

  var av = document.createElement('span');
  av.className = 'avatar';
  av.textContent = initials(it.assignedTo);
  av.style.background = avatarColor(it.assignedTo || '?');
  av.title = it.assignedTo;
  side.appendChild(av);

  var actions = document.createElement('div');
  actions.className = 'card-actions';

  var check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'quick-check';
  check.title = 'Marquer comme terminé';
  check.checked = it.status === 'fini';
  check.onchange = function () {
    updateDevoir(it.id, { status: check.checked ? 'fini' : 'a_faire' });
  };
  actions.appendChild(check);

  var sel = document.createElement('select');
  sel.className = 'status-select';
  Object.keys(STATUS).forEach(function (key) {
    var opt = document.createElement('option');
    opt.value = key;
    opt.textContent = STATUS[key].label;
    if (it.status === key) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = function () { updateDevoir(it.id, { status: sel.value }); };
  actions.appendChild(sel);

  var kebabWrap = document.createElement('div');
  kebabWrap.className = 'kebab-wrap';

  var kebabBtn = document.createElement('button');
  kebabBtn.className = 'icon-btn';
  kebabBtn.title = 'Options';
  kebabBtn.innerHTML = '&#8942;';
  kebabWrap.appendChild(kebabBtn);

  var menu = document.createElement('div');
  menu.className = 'kebab-menu';

  var editBtn = document.createElement('button');
  editBtn.textContent = 'Modifier';
  editBtn.onclick = function (e) {
    e.stopPropagation();
    menu.classList.remove('open');
    openPanel(it);
  };
  menu.appendChild(editBtn);

  var icsBtn = document.createElement('button');
  icsBtn.textContent = '📅 Ajouter au calendrier';
  icsBtn.onclick = function (e) {
    e.stopPropagation();
    menu.classList.remove('open');
    downloadIcs(it);
  };
  menu.appendChild(icsBtn);

  var dupBtn = document.createElement('button');
  dupBtn.textContent = '🔁 Dupliquer (+7 j)';
  dupBtn.onclick = function (e) {
    e.stopPropagation();
    menu.classList.remove('open');
    duplicateDevoir(it);
  };
  menu.appendChild(dupBtn);

  var delBtn = document.createElement('button');
  delBtn.className = 'danger';
  delBtn.textContent = 'Supprimer';
  var confirming = false;
  delBtn.onclick = function (e) {
    e.stopPropagation();
    if (!confirming) {
      confirming = true;
      delBtn.classList.add('confirm');
      delBtn.textContent = 'Confirmer ?';
      setTimeout(function () {
        confirming = false;
        delBtn.classList.remove('confirm');
        delBtn.textContent = 'Supprimer';
      }, 3000);
      return;
    }
    menu.classList.remove('open');
    deleteDevoir(it.id);
  };
  menu.appendChild(delBtn);

  kebabWrap.appendChild(menu);
  kebabBtn.onclick = function (e) {
    e.stopPropagation();
    var wasOpen = menu.classList.contains('open');
    closeAllKebabMenus();
    if (!wasOpen) menu.classList.add('open');
  };
  actions.appendChild(kebabWrap);

  side.appendChild(actions);
  card.appendChild(side);
  return card;
}

function closeAllKebabMenus() {
  document.querySelectorAll('.kebab-menu.open').forEach(function (m) {
    m.classList.remove('open');
  });
}

document.addEventListener('click', closeAllKebabMenus);

function render() {
  renderWhoAmI();
  renderStats();
  renderChips();

  var query = searchQuery.trim().toLowerCase();
  var filtered = items.filter(function (it) {
    if (filter !== 'tous' && it.assignedTo !== filter) return false;
    if (query) {
      var hay = (it.title + ' ' + (it.subject || '')).toLowerCase();
      if (hay.indexOf(query) === -1) return false;
    }
    return true;
  });

  var active = filtered.filter(function (it) { return it.status !== 'fini'; });
  var done = filtered.filter(function (it) { return it.status === 'fini'; })
    .sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });

  var list = document.getElementById('list');
  list.innerHTML = '';

  if (active.length === 0 && (done.length === 0 || !showDone)) {
    var empty = document.createElement('div');
    empty.className = 'empty';
    if (query) {
      empty.innerHTML = '<div class="big">🔍</div>' +
        '<p><strong>Aucun résultat pour cette recherche.</strong></p>';
    } else {
      empty.innerHTML = '<div class="big">📓</div>' +
        '<p><strong>Aucun devoir ici pour l\'instant.</strong></p>' +
        '<p>Ajoutez le premier avec le bouton ci-dessous.</p>';
    }
    list.appendChild(empty);
  } else if (sortBy === 'matiere' || sortBy === 'personne') {
    var field = sortBy === 'matiere' ? 'subject' : 'assignedTo';
    active.sort(function (a, b) {
      var cmp = (a[field] || '').localeCompare(b[field] || '');
      return cmp !== 0 ? cmp : a.dueDate.localeCompare(b.dueDate);
    });
    active.forEach(function (it) { list.appendChild(makeCard(it)); });
    if (showDone) done.forEach(function (it) { list.appendChild(makeCard(it)); });
  } else {
    active.sort(function (a, b) { return a.dueDate.localeCompare(b.dueDate); });
    var groups = [
      { label: 'En retard', items: [] },
      { label: 'Cette semaine', items: [] },
      { label: 'Semaine prochaine', items: [] },
      { label: 'Plus tard', items: [] }
    ];
    active.forEach(function (it) {
      var diff = dueInfo(it.dueDate).diff;
      if (diff < 0) groups[0].items.push(it);
      else if (diff <= 6) groups[1].items.push(it);
      else if (diff <= 13) groups[2].items.push(it);
      else groups[3].items.push(it);
    });
    groups.forEach(function (g) {
      if (g.items.length === 0) return;
      var header = document.createElement('div');
      header.className = 'group-header';
      header.textContent = g.label;
      list.appendChild(header);
      g.items.forEach(function (it) { list.appendChild(makeCard(it)); });
    });
    if (showDone) done.forEach(function (it) { list.appendChild(makeCard(it)); });
  }

  var toggleWrap = document.getElementById('done-toggle-wrap');
  var toggleBtn = document.getElementById('done-toggle');
  if (done.length > 0) {
    toggleWrap.style.display = 'block';
    toggleBtn.textContent = showDone ? 'Masquer les terminés (' + done.length + ')' : 'Afficher les terminés (' + done.length + ')';
  } else {
    toggleWrap.style.display = 'none';
  }
}

function renderTypeRow() {
  var wrap = document.getElementById('type-row');
  var current = wrap.getAttribute('data-value') || 'devoir';
  var btns = wrap.querySelectorAll('.type-pick');
  btns.forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-type') === current);
  });
}

function openPanel(it) {
  editingId = it ? it.id : null;
  document.getElementById('panel-title').textContent = it ? 'Modifier le devoir' : 'Nouveau devoir';
  document.getElementById('f-title').value = it ? it.title : '';
  document.getElementById('f-date').value = it ? it.dueDate : '';
  document.getElementById('f-weight').value = it && it.weight ? it.weight : '';
  document.getElementById('f-duration').value = it ? it.duration || '' : '';
  document.getElementById('f-desc').value = it ? it.description || '' : '';
  document.getElementById('assign-row').setAttribute('data-value', it ? it.assignedTo : myName);
  document.getElementById('f-subject').setAttribute('data-current', it ? it.subject || '' : '');
  document.getElementById('type-row').setAttribute('data-value', it ? it.type || 'devoir' : 'devoir');
  document.getElementById('new-course-row').classList.remove('show');
  document.getElementById('new-course-input').value = '';
  renderAssignRow();
  renderSubjectSelect();
  renderTypeRow();
  document.getElementById('panel').classList.add('open');
  document.getElementById('f-title').focus();
}

function closePanel() {
  document.getElementById('panel').classList.remove('open');
  editingId = null;
}

function savePanel() {
  var title = document.getElementById('f-title').value.trim();
  var dueDate = document.getElementById('f-date').value;
  if (!title || !dueDate) {
    document.getElementById('f-title').focus();
    return;
  }
  var weightVal = document.getElementById('f-weight').value.trim();
  var data = {
    title: title,
    type: document.getElementById('type-row').getAttribute('data-value') || 'devoir',
    subject: document.getElementById('f-subject').value,
    dueDate: dueDate,
    weight: weightVal ? Number(weightVal) : null,
    duration: document.getElementById('f-duration').value,
    description: document.getElementById('f-desc').value.trim(),
    assignedTo: document.getElementById('assign-row').getAttribute('data-value') || myName
  };
  if (editingId) {
    updateDevoir(editingId, data);
  } else {
    data.status = 'a_faire';
    addDevoir(data);
  }
  closePanel();
}

document.getElementById('open-add').onclick = function () { openPanel(null); };
document.getElementById('cancel-panel').onclick = closePanel;
document.getElementById('save-panel').onclick = savePanel;

document.querySelectorAll('.type-pick').forEach(function (btn) {
  btn.onclick = function () {
    document.getElementById('type-row').setAttribute('data-value', btn.getAttribute('data-type'));
    renderTypeRow();
  };
});

document.getElementById('f-subject').onchange = function () {
  if (this.value === '__new__') {
    this.value = this.getAttribute('data-current') || '';
    document.getElementById('new-course-row').classList.add('show');
    document.getElementById('new-course-input').focus();
  } else {
    this.setAttribute('data-current', this.value);
  }
};

document.getElementById('add-course-btn').onclick = function () {
  var name = document.getElementById('new-course-input').value.trim();
  if (!name) return;
  var owner = document.getElementById('assign-row').getAttribute('data-value') || myName;
  coursesCol.add({ name: name, owner: owner }).then(function (ref) {
    courses.push({ id: ref.id, name: name, owner: owner });
    document.getElementById('f-subject').setAttribute('data-current', name);
    document.getElementById('new-course-input').value = '';
    document.getElementById('new-course-row').classList.remove('show');
    renderSubjectSelect();
  }).catch(function () {
    showBanner("Échec de l'ajout du cours — vérifie ta connexion et réessaie.");
  });
};

document.getElementById('new-course-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('add-course-btn').click(); }
});
document.getElementById('done-toggle').onclick = function () { showDone = !showDone; render(); };

document.getElementById('switch-name').onclick = function () {
  document.querySelectorAll('.name-pick').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-name') === myName);
  });
  document.getElementById('name-overlay').classList.remove('hidden');
};

document.querySelectorAll('.name-pick').forEach(function (btn) {
  btn.onclick = function () {
    myName = btn.getAttribute('data-name');
    localStorage.setItem('devoirs-name', myName);
    document.getElementById('name-overlay').classList.add('hidden');
    render();
  };
});

document.getElementById('search-input').addEventListener('input', function () {
  searchQuery = this.value;
  render();
});

document.getElementById('sort-select').onchange = function () {
  sortBy = this.value;
  render();
};

var THEME_ICONS = { auto: '🌓', light: '☀️', dark: '🌙' };
function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  document.getElementById('theme-toggle').textContent = THEME_ICONS[theme];
}
applyTheme(currentTheme);
document.getElementById('theme-toggle').onclick = function () {
  var order = ['auto', 'light', 'dark'];
  currentTheme = order[(order.indexOf(currentTheme) + 1) % order.length];
  localStorage.setItem('devoirs-theme', currentTheme);
  applyTheme(currentTheme);
};

if (myName) {
  document.getElementById('name-overlay').classList.add('hidden');
}

render();
