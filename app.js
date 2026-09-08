/* Devoirs à deux — application à écrans séparés.
   Liste · Ajouter/Modifier · Détail · Semaine · Réglages
   Navigation par history.pushState : le bouton retour du téléphone marche. */

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

var KNOWN_NAMES = ['Léonie', 'Gabriel'];

var TYPES = {
  devoir: { label: 'Devoir', icon: 'ph-note-pencil' },
  examen: { label: 'Examen', icon: 'ph-target' },
  lecture: { label: 'Lecture', icon: 'ph-book-open' },
  projet: { label: "Projet d'équipe", icon: 'ph-users-three' }
};
var STATUS = {
  a_faire: { label: 'À faire' },
  en_cours: { label: 'En cours' },
  fini: { label: 'Fini' }
};
var DURATIONS = ['15 min', '30 min', '1 h', '1 h 30', '2 h', '3 h et plus'];
var SUBJECT_COLORS = ['#9184d9', '#b58ac4', '#8fbfae', '#8aa6d4', '#c2a97f', '#a89ad4', '#7fb0b8'];
var DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
var DAYS_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
var DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
var MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
var MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

var state = {
  view: 'list',
  selId: null,
  items: [],
  courses: [],
  loaded: false,
  myName: localStorage.getItem('devoirs-name') || '',
  theme: localStorage.getItem('devoirs-theme') || 'auto',
  filter: 'tous',
  query: '',
  sortBy: 'date',
  showDone: false,
  weekOffset: 0,
  draft: null,
  editingId: null,
  newCourse: false,
  editingCourse: null,
  remindersOn: remindersEnabled(),
  banner: ''
};

/* ── outils ─────────────────────────────────────────────── */

function h(tag, attrs, kids) {
  var el = document.createElement(tag);
  if (attrs) {
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el[k.toLowerCase()] = v;
      else el.setAttribute(k, v);
    }
  }
  if (kids != null) {
    (Object.prototype.toString.call(kids) === '[object Array]' ? kids : [kids]).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
  }
  return el;
}

function icon(name, cls) { return h('i', { class: (cls || 'ph') + ' ' + name, 'aria-hidden': 'true' }); }

function iso(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function parseDate(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function shiftDays(n) { var d = today(); d.setDate(d.getDate() + n); return iso(d); }

function dueInfo(dueDate) {
  if (!dueDate) return { diff: 9999, text: 'Sans date', abs: '', cls: '' };
  var d = parseDate(dueDate);
  var diff = Math.round((d - today()) / 86400000);
  var abs = DAYS_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
  if (diff < 0) {
    var n = Math.abs(diff);
    return { diff: diff, text: n + ' j de retard', abs: abs, cls: 'overdue' };
  }
  if (diff === 0) return { diff: diff, text: "Aujourd'hui", abs: abs, cls: 'soon' };
  if (diff === 1) return { diff: diff, text: 'Demain', abs: abs, cls: 'soon' };
  if (diff <= 7) return { diff: diff, text: 'Dans ' + diff + ' j', abs: abs, cls: '' };
  return { diff: diff, text: abs, abs: abs, cls: '' };
}

function longDate(dueDate) {
  var d = parseDate(dueDate);
  if (!d) return 'Pas de date de remise';
  return DAYS_LONG[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()];
}

function relativeTime(isoStr) {
  var then = new Date(isoStr).getTime();
  if (isNaN(then)) return '';
  var mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return 'il y a ' + mins + ' min';
  var hrs = Math.round(mins / 60);
  if (hrs < 24) return 'il y a ' + hrs + ' h';
  var days = Math.round(hrs / 24);
  return 'il y a ' + days + ' j';
}

function subjectKey(name) { return (name || '').trim().toLowerCase(); }

function courseByName(name) {
  var key = subjectKey(name);
  for (var i = 0; i < state.courses.length; i++) {
    if (subjectKey(state.courses[i].name) === key) return state.courses[i];
  }
  return null;
}

function subjectColor(name) {
  var c = courseByName(name);
  if (c && c.color) return c.color;
  if (!name) return '#9397ab';
  var sum = 0;
  for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return SUBJECT_COLORS[sum % SUBJECT_COLORS.length];
}

function subjectCount(name) {
  var key = subjectKey(name);
  var n = 0;
  state.items.forEach(function (it) { if (subjectKey(it.subject) === key) n++; });
  return n;
}

function allSubjects() {
  var seen = {};
  var list = [];
  state.courses.forEach(function (c) {
    var key = subjectKey(c.name);
    if (!key || seen[key]) return;
    seen[key] = true;
    list.push({ id: c.id, name: c.name, color: c.color || null });
  });
  state.items.forEach(function (it) {
    var key = subjectKey(it.subject);
    if (!key || seen[key]) return;
    seen[key] = true;
    list.push({ id: null, name: it.subject, color: null });
  });
  list.sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });
  return list;
}

function hasDuplicateSubjects() {
  var raw = {};
  state.courses.forEach(function (c) {
    var key = subjectKey(c.name);
    if (!key) return;
    raw[key] = raw[key] || {};
    raw[key][c.name] = true;
  });
  state.items.forEach(function (it) {
    if (!it.subject) return;
    var key = subjectKey(it.subject);
    raw[key] = raw[key] || {};
    raw[key][it.subject] = true;
  });
  var dup = false;
  Object.keys(raw).forEach(function (key) { if (Object.keys(raw[key]).length > 1) dup = true; });
  return dup;
}

function mergeDuplicateSubjects() {
  var raw = {};
  state.courses.forEach(function (c) {
    var key = subjectKey(c.name);
    if (!key) return;
    raw[key] = raw[key] || {};
    raw[key][c.name] = raw[key][c.name] || 0;
  });
  state.items.forEach(function (it) {
    if (!it.subject) return;
    var key = subjectKey(it.subject);
    raw[key] = raw[key] || {};
    raw[key][it.subject] = (raw[key][it.subject] || 0) + 1;
  });

  var didSomething = false;

  Object.keys(raw).forEach(function (key) {
    var variants = Object.keys(raw[key]);
    if (variants.length < 2) return;
    didSomething = true;

    var canonical = variants[0];
    variants.forEach(function (v) { if (raw[key][v] > raw[key][canonical]) canonical = v; });

    var docs = state.courses.filter(function (c) { return subjectKey(c.name) === key; });
    var color = null;
    docs.forEach(function (c) { if (c.color && !color) color = c.color; });
    if (!color) color = subjectColor(canonical);

    var kept = false;
    docs.forEach(function (c) {
      if (!kept) {
        kept = true;
        coursesCol.doc(c.id).update({ name: canonical, color: color });
      } else {
        coursesCol.doc(c.id).delete();
      }
    });
    if (!kept) coursesCol.add({ name: canonical, color: color });

    state.items.forEach(function (it) {
      if (it.subject && it.subject !== canonical && subjectKey(it.subject) === key) {
        col.doc(it.id).update({ subject: canonical, updatedAt: new Date().toISOString(), updatedBy: state.myName });
      }
    });
  });

  showBanner(didSomething ? 'Matières fusionnées.' : 'Aucun doublon trouvé.');
}

function cycleCourseColor(entry) {
  var current = entry.color || subjectColor(entry.name);
  var idx = SUBJECT_COLORS.indexOf(current);
  var next = SUBJECT_COLORS[(idx + 1) % SUBJECT_COLORS.length];
  if (entry.id) coursesCol.doc(entry.id).update({ color: next });
  else coursesCol.add({ name: entry.name, color: next });
}

function renameCourse(entry, newName) {
  newName = newName.trim();
  state.editingCourse = null;
  if (!newName || newName === entry.name) { render(); return; }
  if (entry.id) coursesCol.doc(entry.id).update({ name: newName });
  else coursesCol.add({ name: newName, color: entry.color || subjectColor(entry.name) });
  state.items.forEach(function (it) {
    if (it.subject === entry.name) col.doc(it.id).update({ subject: newName, updatedAt: new Date().toISOString(), updatedBy: state.myName });
  });
}

function deleteCourse(entry) {
  var copy = { name: entry.name, color: entry.color };
  coursesCol.doc(entry.id).delete();
  toast('Cours supprimé.', function () { coursesCol.add(copy); });
}

function addCourse(name) {
  name = name.trim();
  if (!name || courseByName(name)) return;
  coursesCol.add({ name: name, color: subjectColor(name) });
}

function initials(name) { return name ? name.trim().charAt(0).toUpperCase() : '?'; }
function isMine(name) { return name === state.myName; }

function subjectNames() {
  var set = {};
  state.courses.forEach(function (c) { if (c.name) set[c.name] = true; });
  state.items.forEach(function (it) { if (it.subject) set[it.subject] = true; });
  return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, 'fr'); });
}

function startOfWeek(offset) {
  var d = today();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + (offset || 0) * 7);
  return d;
}

/* ── navigation ─────────────────────────────────────────── */

var VIEWS = ['list', 'form', 'detail', 'week', 'settings', 'courses'];

function urlFor(view, id) {
  if (view === 'list') return location.pathname;
  return location.pathname + '?v=' + view + (id ? '&id=' + encodeURIComponent(id) : '');
}

function go(view, opts) {
  opts = opts || {};
  state.view = view;
  state.selId = opts.id || null;
  history.pushState({ view: view, id: state.selId }, '', urlFor(view, state.selId));
  render();
  window.scrollTo(0, 0);
}

function back() {
  if (history.length > 1) history.back();
  else { state.view = 'list'; history.replaceState({ view: 'list' }, '', urlFor('list')); render(); }
}

window.addEventListener('popstate', function (e) {
  var st = e.state || {};
  state.view = VIEWS.indexOf(st.view) > -1 ? st.view : 'list';
  state.selId = st.id || null;
  if (state.view !== 'form') { state.draft = null; state.editingId = null; }
  if (state.view !== 'courses') state.editingCourse = null;
  render();
});

function readUrl() {
  var m = /[?&]v=([a-z]+)/.exec(location.search);
  var id = /[?&]id=([^&]+)/.exec(location.search);
  var view = m && VIEWS.indexOf(m[1]) > -1 ? m[1] : 'list';
  if (view === 'form') view = 'list';
  state.view = view;
  state.selId = id ? decodeURIComponent(id[1]) : null;
  history.replaceState({ view: state.view, id: state.selId }, '', urlFor(state.view, state.selId));
}

/* ── écriture Firestore ─────────────────────────────────── */

function showBanner(msg) {
  state.banner = msg;
  render();
  setTimeout(function () { state.banner = ''; render(); }, 5000);
}

function addDevoir(data) {
  data.createdAt = new Date().toISOString();
  data.createdBy = state.myName;
  return col.add(data).catch(function () {
    showBanner("Échec de l'enregistrement — vérifie ta connexion et réessaie.");
  });
}

function updateDevoir(id, data) {
  data.updatedAt = new Date().toISOString();
  data.updatedBy = state.myName;
  return col.doc(id).update(data).catch(function () {
    showBanner("Échec de la mise à jour — vérifie ta connexion et réessaie.");
  });
}

function deleteDevoir(id) {
  return col.doc(id).delete().catch(function () {
    showBanner("Échec de la suppression — vérifie ta connexion et réessaie.");
  });
}

function setStatus(it, status) {
  updateDevoir(it.id, { status: status });
  if (status === 'fini') toast('Bravo — c\'est fini.', function () { updateDevoir(it.id, { status: it.status }); });
}

function payloadOf(it) {
  return {
    title: it.title,
    type: it.type || 'devoir',
    subject: it.subject || '',
    dueDate: it.dueDate || '',
    weight: it.weight || null,
    duration: it.duration || '',
    description: it.description || '',
    assignedTo: it.assignedTo || state.myName,
    status: it.status || 'a_faire'
  };
}

/* ── toast ──────────────────────────────────────────────── */

var toastTimer = null;
function toast(msg, undo) {
  var el = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  var btn = document.getElementById('toast-undo');
  btn.style.display = undo ? '' : 'none';
  btn.onclick = function () { if (undo) undo(); hideToast(); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 5000);
}
function hideToast() {
  document.getElementById('toast').classList.remove('show');
  clearTimeout(toastTimer);
}

/* ── thème ──────────────────────────────────────────────── */

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('devoirs-theme', theme);
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme(state.theme);

/* ── rappels ────────────────────────────────────────────── */

function remindersEnabled() {
  return localStorage.getItem('devoirs-reminders') === '1' && ('Notification' in window) && Notification.permission === 'granted';
}

function toggleReminders() {
  if (state.remindersOn) {
    state.remindersOn = false;
    localStorage.setItem('devoirs-reminders', '0');
    render();
    return;
  }
  if (!('Notification' in window)) { showBanner('Ton navigateur ne supporte pas les notifications.'); return; }
  Notification.requestPermission().then(function (perm) {
    if (perm === 'granted') {
      state.remindersOn = true;
      localStorage.setItem('devoirs-reminders', '1');
      render();
      checkReminders();
    } else {
      showBanner('Permission refusée — active les notifications dans les réglages du téléphone.');
    }
  });
}

function todayKey() { return iso(today()); }

function notifiedMap() {
  try { return JSON.parse(localStorage.getItem('devoirs-notified') || '{}'); } catch (e) { return {}; }
}

function checkReminders() {
  if (!state.remindersOn || !navigator.serviceWorker) return;
  var seen = notifiedMap();
  var due = state.items.filter(function (it) {
    if (it.status === 'fini') return false;
    if (it.assignedTo !== state.myName && it.assignedTo !== 'Nous deux') return false;
    var diff = dueInfo(it.dueDate).diff;
    return diff === 0 || diff === 1 || diff === 7;
  });
  due.forEach(function (it) {
    if (seen[it.id] === todayKey()) return;
    seen[it.id] = todayKey();
    var diff = dueInfo(it.dueDate).diff;
    var when = diff === 0 ? "aujourd'hui" : diff === 1 ? 'demain' : 'dans une semaine';
    var body = it.title + (it.subject ? ' · ' + it.subject : '') + ' — à remettre ' + when;
    navigator.serviceWorker.ready.then(function (reg) {
      reg.showNotification('Devoir à venir', { body: body, icon: 'icon-192.png', badge: 'favicon-32.png', tag: it.id });
    });
  });
  localStorage.setItem('devoirs-notified', JSON.stringify(seen));
}

/* ── barres d'écran ─────────────────────────────────────── */

function topbar(title, opts) {
  opts = opts || {};
  return h('header', { class: 'topbar' }, [
    opts.leftText
      ? h('button', { class: 'bar-text', type: 'button', onclick: opts.onLeft }, opts.leftText)
      : h('button', { class: 'bar-icon', type: 'button', 'aria-label': 'Retour', onclick: opts.onLeft || back }, icon('ph-arrow-left')),
    h('div', { class: 'bar-title' }, title),
    opts.rightText
      ? h('button', {
          class: 'bar-text' + (opts.rightDisabled ? ' disabled' : ' accent'),
          type: 'button', disabled: opts.rightDisabled, onclick: opts.onRight
        }, opts.rightText)
      : (opts.rightIcon
          ? h('button', { class: 'bar-icon' + (opts.rightDanger ? ' danger' : ''), type: 'button', 'aria-label': opts.rightLabel || '', onclick: opts.onRight }, icon(opts.rightIcon))
          : h('span', { class: 'bar-spacer' }))
  ]);
}

/* ── écran : liste ──────────────────────────────────────── */

function renderList() {
  var scr = h('div', { class: 'screen' });

  var late = 0, todo = 0, done = 0;
  state.items.forEach(function (it) {
    if (it.status === 'fini') { done++; return; }
    if (dueInfo(it.dueDate).diff < 0) late++; else todo++;
  });
  var d = today();
  var sub = d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];

  scr.appendChild(h('header', { class: 'list-head' }, [
    h('div', {}, [
      h('h1', {}, 'Devoirs'),
      h('p', { class: 'list-sub' }, [
        sub + ' · ',
        late ? h('span', { class: 'is-late' }, late + ' en retard') : null,
        late ? ' · ' : '',
        todo + ' à venir'
      ])
    ]),
    h('div', { class: 'head-actions' }, [
      h('button', { class: 'bar-icon boxed', type: 'button', 'aria-label': 'Semaine', onclick: function () { go('week'); } }, icon('ph-calendar-blank')),
      h('button', { class: 'bar-icon boxed', type: 'button', 'aria-label': 'Réglages', onclick: function () { go('settings'); } }, icon('ph-sliders-horizontal'))
    ])
  ]));

  if (state.banner) scr.appendChild(h('div', { class: 'banner' }, state.banner));

  var names = ['tous'].concat(KNOWN_NAMES);
  if (state.items.some(function (it) { return it.assignedTo === 'Nous deux'; })) names.push('Nous deux');
  var chips = h('div', { class: 'chips' }, names.map(function (name) {
    return h('button', {
      class: 'chip' + (state.filter === name ? ' active' : ''),
      type: 'button',
      onclick: function () { state.filter = name; render(); }
    }, name === 'tous' ? 'Tous' : (isMine(name) ? 'Moi' : name));
  }));
  scr.appendChild(chips);

  var search = h('input', {
    class: 'search', type: 'search', placeholder: 'Rechercher…', value: state.query,
    oninput: function (e) { state.query = e.target.value; renderListBody(); }
  });
  var sort = h('select', {
    class: 'sort',
    onchange: function (e) { state.sortBy = e.target.value; renderListBody(); }
  }, [
    h('option', { value: 'date' }, 'Date'),
    h('option', { value: 'matiere' }, 'Matière'),
    h('option', { value: 'personne' }, 'Personne')
  ]);
  sort.value = state.sortBy;
  scr.appendChild(h('div', { class: 'search-row' }, [search, sort]));

  scr.appendChild(h('div', { class: 'list', id: 'list-body' }));
  scr.appendChild(h('div', { class: 'fab-fade' }));
  scr.appendChild(h('button', {
    class: 'fab', type: 'button',
    onclick: function () { openForm(null); }
  }, [icon('ph-plus'), 'Ajouter']));

  return scr;
}

function visibleItems() {
  var q = state.query.trim().toLowerCase();
  var list = state.items.filter(function (it) {
    if (state.filter !== 'tous' && it.assignedTo !== state.filter) return false;
    if (q) {
      var hay = (it.title + ' ' + (it.subject || '') + ' ' + (it.description || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
  list.sort(function (a, b) {
    if (state.sortBy === 'matiere') return (a.subject || '').localeCompare(b.subject || '', 'fr') || (a.dueDate || '').localeCompare(b.dueDate || '');
    if (state.sortBy === 'personne') return (a.assignedTo || '').localeCompare(b.assignedTo || '', 'fr') || (a.dueDate || '').localeCompare(b.dueDate || '');
    return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  });
  return list;
}

function renderListBody() {
  var body = document.getElementById('list-body');
  if (!body) return;
  body.innerHTML = '';

  var list = visibleItems();
  var active = list.filter(function (it) { return it.status !== 'fini'; });
  var doneList = list.filter(function (it) { return it.status === 'fini'; })
    .sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });

  if (!state.loaded) {
    body.appendChild(h('div', { class: 'empty' }, h('p', {}, 'Chargement…')));
    return;
  }

  if (!active.length && !doneList.length) {
    body.appendChild(h('div', { class: 'empty' }, [
      h('div', { class: 'big' }, icon(state.query ? 'ph-magnifying-glass' : 'ph-notebook')),
      h('p', { class: 'strong' }, state.query ? 'Aucun résultat pour cette recherche.' : 'Rien ici pour l\'instant.'),
      state.query ? null : h('p', {}, 'Ajoutez le premier avec le bouton ci-dessous.')
    ]));
    return;
  }

  if (state.sortBy === 'date') {
    var buckets = [
      { label: 'En retard', cls: 'is-late', items: [] },
      { label: 'Cette semaine', cls: '', items: [] },
      { label: 'Plus tard', cls: '', items: [] }
    ];
    active.forEach(function (it) {
      var diff = dueInfo(it.dueDate).diff;
      if (diff < 0) buckets[0].items.push(it);
      else if (diff <= 7) buckets[1].items.push(it);
      else buckets[2].items.push(it);
    });
    buckets.forEach(function (b) {
      if (!b.items.length) return;
      body.appendChild(h('div', { class: 'group-header ' + b.cls }, b.label));
      b.items.forEach(function (it) { body.appendChild(card(it)); });
    });
  } else {
    active.forEach(function (it) { body.appendChild(card(it)); });
  }

  if (doneList.length) {
    if (state.showDone) {
      body.appendChild(h('div', { class: 'group-header is-done' }, 'Terminés'));
      doneList.forEach(function (it) { body.appendChild(card(it)); });
    }
    body.appendChild(h('div', { class: 'done-toggle' },
      h('button', { type: 'button', onclick: function () { state.showDone = !state.showDone; renderListBody(); } },
        state.showDone ? 'Masquer les terminés' : doneList.length + (doneList.length > 1 ? ' terminés' : ' terminé'))));
  }
}

function card(it) {
  var info = dueInfo(it.dueDate);
  var done = it.status === 'fini';
  var type = TYPES[it.type] ? TYPES[it.type] : TYPES.devoir;
  var color = subjectColor(it.subject);

  var edge = done ? 'fini' : info.cls;

  var main = h('div', { class: 'card-main', onclick: function () { go('detail', { id: it.id }); } }, [
    h('div', { class: 'card-top' }, [
      it.subject
        ? h('span', { class: 'subject-tag', style: 'color:' + color }, it.subject)
        : h('span', { class: 'subject-tag none' }, 'Sans matière'),
      h('span', { class: 'due-badge ' + (done ? 'is-done' : info.cls) }, done ? 'Fini' : info.text)
    ]),
    h('p', { class: 'card-title' }, it.title),
    h('div', { class: 'card-meta' }, [
      h('span', { class: 'meta' }, [icon(type.icon), type.label]),
      it.weight ? h('span', { class: 'meta' }, [icon('ph-percent'), it.weight + ' %']) : null,
      it.duration ? h('span', { class: 'meta' }, [icon('ph-clock'), it.duration]) : null,
      h('span', { class: 'meta who' }, [
        h('span', { class: 'avatar' + (isMine(it.assignedTo) ? ' me' : '') }, initials(it.assignedTo)),
        it.assignedTo || '?'
      ])
    ])
  ]);

  var check = h('button', {
    class: 'check' + (done ? ' on' : ''), type: 'button',
    'aria-label': done ? 'Rouvrir' : 'Marquer fini',
    onclick: function (e) { e.stopPropagation(); setStatus(it, done ? 'a_faire' : 'fini'); }
  }, done ? icon('ph-check-circle', 'ph-fill') : icon('ph-check'));

  return h('article', { class: 'card' + (edge ? ' ' + edge : '') }, [main, h('div', { class: 'card-side' }, check)]);
}

/* ── écran : ajouter / modifier ─────────────────────────── */

function openForm(it) {
  state.editingId = it ? it.id : null;
  state.newCourse = false;
  state.draft = it ? {
    title: it.title || '',
    type: it.type || 'devoir',
    subject: it.subject || '',
    dueDate: it.dueDate || '',
    weight: it.weight || '',
    duration: it.duration || '',
    description: it.description || '',
    assignedTo: it.assignedTo || state.myName,
    status: it.status || 'a_faire'
  } : {
    title: '', type: 'devoir', subject: subjectNames()[0] || '',
    dueDate: shiftDays(3), weight: '', duration: '', description: '',
    assignedTo: state.myName, status: 'a_faire'
  };
  go('form', { id: state.editingId });
}

function renderForm() {
  var d = state.draft || {};
  var scr = h('div', { class: 'screen' });
  var valid = (d.title || '').trim().length > 0;

  scr.appendChild(topbar(state.editingId ? 'Modifier' : 'Nouveau devoir', {
    leftText: 'Annuler',
    onLeft: back,
    rightText: 'Enregistrer',
    rightDisabled: !valid,
    onRight: saveForm
  }));

  var body = h('div', { class: 'form' });

  body.appendChild(h('div', { class: 'field' }, [
    h('label', {}, 'Type'),
    h('div', { class: 'type-row' }, Object.keys(TYPES).map(function (k) {
      return h('button', {
        class: 'type-pick' + (d.type === k ? ' active' : ''), type: 'button', 'data-type': k,
        onclick: function () { d.type = k; render(); }
      }, [icon(TYPES[k].icon), TYPES[k].label]);
    }))
  ]));

  body.appendChild(h('div', { class: 'field' }, [
    h('label', { for: 'f-title' }, 'Titre'),
    h('input', {
      id: 'f-title', type: 'text', value: d.title, placeholder: 'Ex. Dissertation chapitre 3',
      oninput: function (e) {
        d.title = e.target.value;
        var btn = document.querySelector('.topbar .bar-text.accent, .topbar .bar-text.disabled');
        if (btn) {
          var ok = d.title.trim().length > 0;
          btn.disabled = !ok;
          btn.className = 'bar-text ' + (ok ? 'accent' : 'disabled');
        }
      }
    })
  ]));

  var subjects = subjectNames();
  var sel = h('select', {
    id: 'f-subject',
    onchange: function (e) {
      if (e.target.value === '__new') { state.newCourse = true; render(); }
      else { d.subject = e.target.value; }
    }
  }, subjects.map(function (n) { return h('option', { value: n }, n); })
    .concat([h('option', { value: '__new' }, '+ Nouveau cours…')]));
  sel.value = d.subject || (subjects[0] || '');

  var subjField = h('div', { class: 'field' }, [h('label', { for: 'f-subject' }, 'Matière'), sel]);
  if (state.newCourse) {
    var input = h('input', { type: 'text', placeholder: 'Nom du cours', maxlength: '40' });
    subjField.appendChild(h('div', { class: 'new-course-row' }, [
      input,
      h('button', {
        type: 'button',
        onclick: function () {
          var name = input.value.trim();
          if (!name) return;
          coursesCol.add({ name: name, owner: d.assignedTo || state.myName }).then(function (ref) {
            state.courses.push({ id: ref.id, name: name, owner: d.assignedTo });
            d.subject = name;
            state.newCourse = false;
            render();
          }).catch(function () { showBanner('Impossible d\'ajouter le cours.'); });
        }
      }, 'Ajouter')
    ]));
  }

  body.appendChild(h('div', { class: 'field-row' }, [
    subjField,
    h('div', { class: 'field' }, [
      h('label', { for: 'f-date' }, 'Remise'),
      h('input', { id: 'f-date', type: 'date', value: d.dueDate, oninput: function (e) { d.dueDate = e.target.value; } })
    ])
  ]));

  body.appendChild(h('div', { class: 'field' }, [
    h('label', {}, 'Assigné à'),
    h('div', { class: 'assign-row' }, KNOWN_NAMES.concat(['Nous deux']).map(function (name) {
      return h('button', {
        class: 'assign-pick' + (d.assignedTo === name ? ' active' : ''), type: 'button',
        onclick: function () { d.assignedTo = name; render(); }
      }, [
        name === 'Nous deux' ? icon('ph-users-three') : h('span', { class: 'avatar' + (d.assignedTo === name ? ' me' : '') }, initials(name)),
        name
      ]);
    }))
  ]));

  body.appendChild(h('div', { class: 'field' }, [
    h('label', { for: 'f-desc' }, [ 'Description ', h('span', { class: 'opt' }, '— facultatif') ]),
    h('textarea', { id: 'f-desc', placeholder: 'Détails, consignes, liens…', oninput: function (e) { d.description = e.target.value; } }, d.description || '')
  ]));

  var dur = h('select', { id: 'f-duration', onchange: function (e) { d.duration = e.target.value; } },
    [h('option', { value: '' }, 'Optionnel')].concat(DURATIONS.map(function (v) { return h('option', { value: v }, v); })));
  dur.value = d.duration || '';

  body.appendChild(h('div', { class: 'field-row' }, [
    h('div', { class: 'field' }, [
      h('label', { for: 'f-weight' }, 'Pondération'),
      h('input', { id: 'f-weight', type: 'number', min: '0', max: '100', value: d.weight, placeholder: '%', oninput: function (e) { d.weight = e.target.value; } })
    ]),
    h('div', { class: 'field' }, [h('label', { for: 'f-duration' }, 'Durée estimée'), dur])
  ]));

  if (state.editingId) {
    var st = h('select', { id: 'f-status', onchange: function (e) { d.status = e.target.value; } },
      Object.keys(STATUS).map(function (k) { return h('option', { value: k }, STATUS[k].label); }));
    st.value = d.status || 'a_faire';
    body.appendChild(h('div', { class: 'field' }, [h('label', { for: 'f-status' }, 'Statut'), st]));
  }

  scr.appendChild(body);
  return scr;
}

function saveForm() {
  var d = state.draft;
  if (!d || !d.title.trim()) return;
  var payload = payloadOf({
    title: d.title.trim(),
    type: d.type,
    subject: d.subject,
    dueDate: d.dueDate,
    weight: d.weight ? Number(d.weight) : null,
    duration: d.duration,
    description: (d.description || '').trim(),
    assignedTo: d.assignedTo,
    status: d.status
  });
  if (state.editingId) {
    updateDevoir(state.editingId, payload);
    state.draft = null;
    var id = state.editingId;
    state.editingId = null;
    history.replaceState({ view: 'detail', id: id }, '', urlFor('detail', id));
    state.view = 'detail';
    state.selId = id;
    render();
    toast('Devoir mis à jour.');
  } else {
    addDevoir(payload);
    state.draft = null;
    state.filter = 'tous';
    history.replaceState({ view: 'list' }, '', urlFor('list'));
    state.view = 'list';
    render();
    toast('Devoir ajouté.');
  }
}

/* ── écran : détail ─────────────────────────────────────── */

function renderDetail() {
  var it = state.items.filter(function (x) { return x.id === state.selId; })[0];
  if (!it) {
    return h('div', { class: 'screen' }, [
      topbar('Devoir', {}),
      h('div', { class: 'empty' }, h('p', {}, state.loaded ? 'Ce devoir n\'existe plus.' : 'Chargement…'))
    ]);
  }

  var info = dueInfo(it.dueDate);
  var done = it.status === 'fini';
  var type = TYPES[it.type] ? TYPES[it.type] : TYPES.devoir;
  var color = subjectColor(it.subject);

  var rows = [{ k: 'Assigné à', v: it.assignedTo || '?' }];
  if (it.weight) rows.push({ k: 'Pondération', v: it.weight + ' %' });
  if (it.duration) rows.push({ k: 'Durée estimée', v: it.duration });
  rows.push({ k: 'Statut', v: (STATUS[it.status] || STATUS.a_faire).label });

  var hist = '';
  if (it.updatedBy && it.updatedAt) hist = 'Modifié par ' + it.updatedBy + ' · ' + relativeTime(it.updatedAt);
  else if (it.createdBy && it.createdAt) hist = 'Ajouté par ' + it.createdBy + ' · ' + relativeTime(it.createdAt);

  var scr = h('div', { class: 'screen' });
  scr.appendChild(h('header', { class: 'topbar' }, [
    h('button', { class: 'bar-icon', type: 'button', 'aria-label': 'Retour', onclick: back }, icon('ph-arrow-left')),
    h('span', { class: 'bar-spacer' }),
    h('div', { class: 'bar-tools' }, [
      h('button', { class: 'bar-icon', type: 'button', 'aria-label': 'Modifier', onclick: function () { openForm(it); } }, icon('ph-pencil-simple')),
      h('button', { class: 'bar-icon', type: 'button', 'aria-label': 'Ajouter au calendrier', onclick: function () { downloadIcs(it); } }, icon('ph-calendar-plus')),
      h('button', {
        class: 'bar-icon danger', type: 'button', 'aria-label': 'Supprimer',
        onclick: function () {
          var copy = payloadOf(it);
          deleteDevoir(it.id);
          back();
          toast('Devoir supprimé.', function () { addDevoir(copy); });
        }
      }, icon('ph-trash'))
    ])
  ]));

  var body = h('div', { class: 'detail' }, [
    h('div', { class: 'detail-kicker' }, [
      it.subject ? h('span', { class: 'subject-tag', style: 'color:' + color }, it.subject) : null,
      h('span', { class: 'meta' }, [icon(type.icon), type.label])
    ]),
    h('h1', {}, it.title),
    h('div', { class: 'due-block ' + (done ? 'is-done' : info.cls) }, [
      icon(done ? 'ph-check-circle' : 'ph-calendar-blank'),
      h('div', {}, [
        h('div', { class: 'due-line' }, done ? 'Terminé' : (info.diff < 0 ? 'En retard — ' + info.text : 'À remettre ' + (info.diff === 0 ? "aujourd'hui" : info.diff === 1 ? 'demain' : 'dans ' + info.diff + ' jours'))),
        h('div', { class: 'due-sub' }, longDate(it.dueDate))
      ])
    ]),
    h('dl', { class: 'rows' }, rows.map(function (r) {
      return h('div', { class: 'row' }, [h('dt', {}, r.k), h('dd', {}, r.v)]);
    }))
  ]);

  if (it.description) {
    body.appendChild(h('div', { class: 'block' }, [
      h('label', {}, 'Description'),
      h('p', { class: 'desc' }, it.description)
    ]));
  }
  if (hist) body.appendChild(h('p', { class: 'hist' }, hist));

  body.appendChild(h('div', { class: 'detail-actions' }, [
    h('button', {
      class: 'btn-solid', type: 'button',
      onclick: function () { setStatus(it, done ? 'a_faire' : 'fini'); if (!done) back(); }
    }, [icon(done ? 'ph-arrow-counter-clockwise' : 'ph-check'), done ? 'Rouvrir' : 'Marquer fini']),
    h('button', {
      class: 'btn-ghost', type: 'button',
      onclick: function () {
        var next = parseDate(it.dueDate) || today();
        next.setDate(next.getDate() + 7);
        var copy = payloadOf(it);
        copy.dueDate = iso(next);
        copy.status = 'a_faire';
        addDevoir(copy);
        toast('Copié à la semaine suivante.');
      }
    }, [icon('ph-copy'), 'Répéter dans 7 j'])
  ]));

  scr.appendChild(body);
  return scr;
}

function escapeIcs(s) { return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }

function downloadIcs(it) {
  if (!it.dueDate) { showBanner('Ce devoir n\'a pas de date.'); return; }
  var type = TYPES[it.type] ? TYPES[it.type].label : 'Devoir';
  var dateStr = it.dueDate.replace(/-/g, '');
  var lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//devoirs-a-deux//FR',
    'BEGIN:VEVENT',
    'UID:' + it.id + '@devoirs',
    'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
    'DTSTART;VALUE=DATE:' + dateStr,
    'SUMMARY:' + escapeIcs(type + ' : ' + it.title + (it.subject ? ' (' + it.subject + ')' : '')),
    'DESCRIPTION:' + escapeIcs(it.description || ''),
    'END:VEVENT', 'END:VCALENDAR'
  ];
  var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  var a = h('a', { href: URL.createObjectURL(blob), download: 'devoir.ics' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── écran : semaine ────────────────────────────────────── */

function renderWeek() {
  var monday = startOfWeek(state.weekOffset);
  var dates = [];
  for (var i = 0; i < 7; i++) { var dt = new Date(monday); dt.setDate(dt.getDate() + i); dates.push(dt); }

  var byDate = {};
  state.items.forEach(function (it) {
    if (!it.dueDate) return;
    (byDate[it.dueDate] = byDate[it.dueDate] || []).push(it);
  });

  var inWeek = state.items.filter(function (it) {
    return it.dueDate >= iso(dates[0]) && it.dueDate <= iso(dates[6]);
  });
  var wLate = inWeek.filter(function (it) { return it.status !== 'fini' && dueInfo(it.dueDate).diff < 0; }).length;
  var wDone = inWeek.filter(function (it) { return it.status === 'fini'; }).length;
  var wTodo = inWeek.length - wDone;

  var scr = h('div', { class: 'screen' });
  scr.appendChild(h('header', { class: 'topbar' }, [
    h('button', { class: 'bar-icon', type: 'button', 'aria-label': 'Semaine précédente', onclick: function () { state.weekOffset--; render(); } }, icon('ph-caret-left')),
    h('div', { class: 'bar-title' }, 'Semaine du ' + dates[0].getDate() + ' ' + MONTHS_SHORT[dates[0].getMonth()]),
    h('button', { class: 'bar-icon', type: 'button', 'aria-label': 'Semaine suivante', onclick: function () { state.weekOffset++; render(); } }, icon('ph-caret-right'))
  ]));

  scr.appendChild(h('div', { class: 'week-strip' }, dates.map(function (dt, i) {
    var key = iso(dt);
    var day = byDate[key] || [];
    var pending = day.filter(function (x) { return x.status !== 'fini'; });
    var late = pending.some(function (x) { return dueInfo(x.dueDate).diff < 0; });
    var isToday = key === iso(today());
    var dotCls = !day.length ? 'none' : (late ? 'late' : (pending.length ? 'pending' : 'done'));
    return h('button', {
      class: 'day' + (isToday ? ' today' : '') + (i > 4 ? ' weekend' : ''), type: 'button',
      onclick: function () { if (day.length) go('detail', { id: day[0].id }); }
    }, [
      h('span', { class: 'dow' }, DOW[i]),
      h('span', { class: 'num' }, dt.getDate()),
      h('span', { class: 'dot ' + dotCls, style: dotCls === 'pending' ? 'background:' + subjectColor(pending[0].subject) : null })
    ]);
  })));

  var body = h('div', { class: 'week-body' });
  body.appendChild(h('div', { class: 'stats' }, [
    h('div', { class: 'stat' }, [h('div', { class: 'num' }, wTodo), h('div', { class: 'lbl' }, 'à faire')]),
    h('div', { class: 'stat overdue' }, [h('div', { class: 'num' }, wLate), h('div', { class: 'lbl' }, 'en retard')]),
    h('div', { class: 'stat done' }, [h('div', { class: 'num' }, wDone), h('div', { class: 'lbl' }, 'terminés')])
  ]));

  var shown = dates.filter(function (dt) { return (byDate[iso(dt)] || []).length || iso(dt) === iso(today()); });
  if (!shown.length) {
    body.appendChild(h('div', { class: 'empty' }, h('p', {}, 'Rien de prévu cette semaine.')));
  }
  shown.forEach(function (dt) {
    var key = iso(dt);
    var day = byDate[key] || [];
    var info = dueInfo(key);
    var rel = info.diff === 0 ? "aujourd'hui" : (info.diff === 1 ? 'demain' : (info.diff < 0 ? 'passé' : ''));
    body.appendChild(h('div', { class: 'day-row' }, [
      h('div', { class: 'day-label' + (info.diff === 0 ? ' today' : '') + (info.diff < 0 ? ' past' : '') }, [
        h('div', { class: 'd' }, DAYS_SHORT[dt.getDay()] + ' ' + dt.getDate()),
        rel ? h('div', { class: 'r' }, rel) : null
      ]),
      h('div', { class: 'day-items' }, day.length ? day.map(function (it) {
        var color = subjectColor(it.subject);
        var doneIt = it.status === 'fini';
        var bits = [it.assignedTo];
        if (it.weight) bits.push(it.weight + ' %');
        else if (it.duration) bits.push(it.duration);
        return h('button', {
          class: 'week-card' + (doneIt ? ' fini' : ''), type: 'button',
          style: 'border-left-color:' + (doneIt ? '#8fbfae' : color),
          onclick: function () { go('detail', { id: it.id }); }
        }, [
          h('div', { class: 'wc-subject', style: 'color:' + color }, it.subject || 'Sans matière'),
          h('div', { class: 'wc-title' }, it.title),
          h('div', { class: 'wc-meta' }, bits.join(' · '))
        ]);
      }) : h('div', { class: 'nothing' }, 'Rien de prévu'))
    ]));
  });

  scr.appendChild(body);
  return scr;
}

/* ── écran : réglages ───────────────────────────────────── */

function renderSettings() {
  var other = state.myName === 'Léonie' ? 'Gabriel' : 'Léonie';
  var scr = h('div', { class: 'screen' });
  scr.appendChild(topbar('Réglages', {}));

  var body = h('div', { class: 'settings' });

  body.appendChild(h('div', { class: 'me-card' }, [
    h('div', { class: 'avatar big me' }, initials(state.myName)),
    h('div', { class: 'me-text' }, [
      h('div', { class: 'me-name' }, state.myName || '—'),
      h('div', { class: 'me-sub' }, 'Partagé avec ' + other)
    ]),
    h('button', {
      class: 'btn-mini', type: 'button',
      onclick: function () {
        state.myName = other;
        localStorage.setItem('devoirs-name', other);
        render();
      }
    }, 'Changer')
  ]));

  body.appendChild(h('label', { class: 'section' }, 'Thème'));
  body.appendChild(h('div', { class: 'theme-row' }, [
    { k: 'light', label: 'Clair', icon: 'ph-sun' },
    { k: 'dark', label: 'Sombre', icon: 'ph-moon' },
    { k: 'auto', label: 'Système', icon: 'ph-circle-half' }
  ].map(function (t) {
    return h('button', {
      class: 'theme-pick' + (state.theme === t.k ? ' active' : ''), type: 'button',
      onclick: function () { applyTheme(t.k); render(); }
    }, [icon(t.icon), h('span', {}, t.label)]);
  })));

  body.appendChild(h('label', { class: 'section' }, 'Affichage'));
  body.appendChild(h('div', { class: 'rows' }, [
    h('div', {
      class: 'row tap', onclick: function () { state.showDone = !state.showDone; render(); }
    }, [
      h('dt', {}, 'Afficher les terminés'),
      h('dd', {}, h('span', { class: 'switch' + (state.showDone ? ' on' : '') }, h('span', { class: 'knob' })))
    ]),
    h('div', { class: 'row tap', onclick: function () { go('courses'); } }, [
      h('dt', {}, 'Cours enregistrés'),
      h('dd', {}, String(subjectNames().length))
    ])
  ]));

  body.appendChild(h('label', { class: 'section' }, 'Rappels'));
  body.appendChild(h('div', { class: 'rows' }, [
    h('div', { class: 'row tap', onclick: toggleReminders }, [
      h('dt', {}, 'Rappels de devoirs'),
      h('dd', {}, h('span', { class: 'switch' + (state.remindersOn ? ' on' : '') }, h('span', { class: 'knob' })))
    ])
  ]));
  body.appendChild(h('p', { class: 'hist' }, 'À l\'ouverture de l\'app, un rappel s\'affiche pour un devoir qui arrive dans une semaine, demain ou aujourd\'hui.'));

  body.appendChild(h('p', { class: 'hist' }, 'Devoirs à deux · les données sont partagées en direct entre vos deux téléphones.'));

  scr.appendChild(body);
  return scr;
}

/* ── écran : cours ──────────────────────────────────────── */

function renderCourses() {
  var scr = h('div', { class: 'screen' });
  scr.appendChild(topbar('Mes cours', {}));

  var body = h('div', { class: 'settings' });

  if (hasDuplicateSubjects()) {
    body.appendChild(h('button', {
      class: 'btn-ghost merge-btn', type: 'button',
      onclick: function () { mergeDuplicateSubjects(); }
    }, [icon('ph-broom'), 'Fusionner les doublons']));
  }

  var rows = h('div', { class: 'rows' });
  allSubjects().forEach(function (entry) {
    var count = subjectCount(entry.name);
    var color = entry.color || subjectColor(entry.name);

    var nameCell;
    if (state.editingCourse === entry.name) {
      var input = h('input', { type: 'text', value: entry.name, maxlength: '40' });
      nameCell = h('div', { class: 'new-course-row course-edit' }, [
        input,
        h('button', { type: 'button', onclick: function () { renameCourse(entry, input.value); } }, 'OK')
      ]);
    } else {
      nameCell = h('dt', { class: 'course-name', onclick: function () { state.editingCourse = entry.name; render(); } }, entry.name);
    }

    rows.appendChild(h('div', { class: 'row course-row' }, [
      h('button', {
        class: 'color-dot', type: 'button', style: 'background:' + color,
        'aria-label': 'Changer la couleur', onclick: function () { cycleCourseColor(entry); }
      }),
      nameCell,
      h('span', { class: 'course-count' }, count ? (count + (count > 1 ? ' devoirs' : ' devoir')) : 'inutilisé'),
      entry.id && !count
        ? h('button', {
            class: 'course-del', type: 'button', 'aria-label': 'Supprimer',
            onclick: function () { deleteCourse(entry); }
          }, icon('ph-trash'))
        : null
    ]));
  });
  body.appendChild(rows);

  var addInput = h('input', { type: 'text', placeholder: 'Nom du cours', maxlength: '40' });
  body.appendChild(h('div', { class: 'new-course-row' }, [
    addInput,
    h('button', { type: 'button', onclick: function () { addCourse(addInput.value); addInput.value = ''; } }, 'Ajouter')
  ]));

  scr.appendChild(body);
  return scr;
}

/* ── rendu ──────────────────────────────────────────────── */

function render() {
  var root = document.getElementById('app');
  if (!state.myName) {
    document.getElementById('name-overlay').classList.remove('hidden');
    root.innerHTML = '';
    return;
  }
  document.getElementById('name-overlay').classList.add('hidden');

  root.innerHTML = '';
  root.setAttribute('data-view', state.view);
  if (state.view === 'form') root.appendChild(renderForm());
  else if (state.view === 'detail') root.appendChild(renderDetail());
  else if (state.view === 'week') root.appendChild(renderWeek());
  else if (state.view === 'settings') root.appendChild(renderSettings());
  else if (state.view === 'courses') root.appendChild(renderCourses());
  else { root.appendChild(renderList()); renderListBody(); }
}

/* ── démarrage ──────────────────────────────────────────── */

Array.prototype.forEach.call(document.querySelectorAll('.name-pick'), function (btn) {
  btn.onclick = function () {
    state.myName = btn.getAttribute('data-name');
    localStorage.setItem('devoirs-name', state.myName);
    render();
  };
});
document.getElementById('toast-undo').onclick = hideToast;

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') checkReminders();
});

readUrl();
render();

col.onSnapshot(function (snap) {
  var next = [];
  snap.forEach(function (doc) {
    var data = doc.data();
    data.id = doc.id;
    next.push(data);
  });
  state.items = next;
  state.loaded = true;
  render();
  checkReminders();
}, function () {
  state.loaded = true;
  showBanner('Connexion perdue — les changements se synchroniseront au retour du réseau.');
});

coursesCol.onSnapshot(function (snap) {
  var next = [];
  snap.forEach(function (doc) {
    var data = doc.data();
    data.id = doc.id;
    next.push(data);
  });
  state.courses = next;
  if (state.view === 'form') render();
}, function () {});
