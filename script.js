import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  doc,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';

const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// -----------------------------
// Firebase setup (replace with your config)
// -----------------------------
const firebaseConfig = {
  apiKey: 'AIzaSyDUO1CIBi17rgIgERiGmdFqGqLiZeVU0I0',
  authDomain: 'fanclub-62f52.firebaseapp.com',
  projectId: 'fanclub-62f52',
  storageBucket: 'fanclub-62f52.firebasestorage.app',
  messagingSenderId: '296228576888',
  appId: '1:296228576888:web:dcd7c9fbc01170ae10978d',
  measurementId: 'G-Y1NJG4P253',
};

const firebaseConfigured = !Object.values(firebaseConfig).some((value) =>
  String(value).includes('YOUR_')
);

let db = null;
let auth = null;
let memoriesRef = null;

if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  signInAnonymously(auth).catch((error) => {
    console.warn('Anonymous sign-in failed:', error);
  });
  memoriesRef = collection(db, 'memories');
} else {
  console.warn('Firebase config not set. Using local-only storage.');
}

const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// -----------------------------
// Random gallery photos
// -----------------------------
const gallerySlots = document.querySelectorAll('[data-gallery-slot]');
if (gallerySlots.length) {
  const galleryImages = [
    '32FBEF0D-203A-4D82-8FC6-CA3FD3A8D7B7.jpg',
    '46AC1810-AFE2-41FB-B209-3B83E8155AD7.JPG',
    '67A587E1-95A1-42BE-8B0C-86934D864D97.JPG',
    '7EA2CF84-10F9-4F9B-8AC8-B9AB12BB9518.JPG',
    'B69D4230-8AAA-4BEB-A9C5-4B840CABC805.jpg',
    'BCAB023D-3B9B-4374-8A80-0102CA40650B.jpg',
    'C238F628-B647-4E0D-B1E6-7C7C6B528889.JPG',
  ];

  const shuffled = [...galleryImages].sort(() => Math.random() - 0.5);

  gallerySlots.forEach((img, index) => {
    const filename = shuffled[index % shuffled.length];
    img.src = `Assets/${filename}`;
    img.alt = `Memory photo ${index + 1}`;
  });
}

// -----------------------------
// Memory Scrapbook (Firestore + local fallback)
// -----------------------------
const memoryForm = document.getElementById('memory-form');
const memoryList = document.getElementById('memory-list');
const clearMemoriesButton = document.getElementById('clear-memories');
const stickyNote = document.getElementById('sticky-note');
const stickyTitle = document.getElementById('sticky-title');
const stickyMeta = document.getElementById('sticky-meta');
const stickyDetails = document.getElementById('sticky-details');

const LOCAL_MEMORIES_KEY = 'mariya_love_club_memories_v1';
const LEGACY_MEMORIES_KEY = 'mari_love_club_memories_v1';

const loadLocalMemories = () => {
  if (typeof localStorage === 'undefined') return [];

  const primaryRaw = localStorage.getItem(LOCAL_MEMORIES_KEY);
  if (primaryRaw) {
    const parsed = safeJsonParse(primaryRaw, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  const legacyRaw = localStorage.getItem(LEGACY_MEMORIES_KEY);
  if (!legacyRaw) return [];
  const legacyParsed = safeJsonParse(legacyRaw, []);
  const items = Array.isArray(legacyParsed) ? legacyParsed : [];
  localStorage.setItem(LOCAL_MEMORIES_KEY, JSON.stringify(items));
  return items;
};

const saveLocalMemories = (items) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_MEMORIES_KEY, JSON.stringify(items));
};

const friendlyDate = (value) => {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const normalizeDate = (memory) => {
  if (!memory) return null;
  if (memory.dateValue && typeof memory.dateValue.toDate === 'function') {
    return memory.dateValue.toDate();
  }
  if (memory.date) {
    const date = new Date(`${memory.date}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const daysUntil = (memory) => {
  const target = normalizeDate(memory);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

let memories = firebaseConfigured ? [] : loadLocalMemories();

const pickNextMemory = () => {
  if (!memories.length) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const future = memories
    .map((memory) => ({ memory, date: normalizeDate(memory) }))
    .filter((entry) => entry.date)
    .filter((entry) => entry.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (future.length) return future[0].memory;
  return memories[0];
};

const renderStickyNote = () => {
  if (!stickyNote || !stickyTitle || !stickyMeta || !stickyDetails) return;

  const next = pickNextMemory();
  if (!next || !normalizeDate(next)) {
    stickyTitle.textContent = 'No planned date yet';
    stickyMeta.textContent = 'Add one in the scrapbook';
    stickyDetails.textContent = '';
    stickyDetails.setAttribute('aria-hidden', 'true');
    stickyNote.dataset.open = 'false';
    stickyNote.setAttribute('aria-expanded', 'false');
    return;
  }

  const dateValue = normalizeDate(next);
  const niceDate = friendlyDate(dateValue);
  const remaining = daysUntil(next);
  let remainingText = 'Date saved';
  if (remaining === 0) remainingText = 'Today';
  if (remaining === 1) remainingText = '1 day left';
  if (remaining > 1) remainingText = `${remaining} days left`;
  if (remaining < 0) remainingText = `${Math.abs(remaining)} days ago`;

  stickyTitle.textContent = next.title ? next.title : 'Planned date';
  stickyMeta.textContent = `${niceDate || 'Date saved'} • ${remainingText}`;
  stickyDetails.textContent = next.details ? next.details : 'No details added.';
};

const renderMemories = () => {
  if (!memoryList) return;
  memoryList.innerHTML = '';

  if (!memories.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No memories saved yet. Add the first one, cutie.';
    empty.style.margin = '0';
    empty.style.fontWeight = '800';
    empty.style.color = 'rgba(111, 85, 96, 0.92)';
    memoryList.appendChild(empty);
    return;
  }

  memories.forEach((item) => {
    const wrapper = document.createElement('article');
    wrapper.className = 'memory-item';

    const head = document.createElement('div');
    head.className = 'memory-item-head';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.gap = '0.75rem';
    left.style.alignItems = 'start';

    const mood = document.createElement('div');
    mood.className = 'memory-mood';
    mood.textContent = item.mood || '🎀';

    const meta = document.createElement('div');

    const title = document.createElement('p');
    title.className = 'memory-title';
    title.textContent = item.title || 'Untitled memory';

    const date = document.createElement('p');
    date.className = 'memory-meta';
    date.textContent = friendlyDate(normalizeDate(item));

    meta.appendChild(title);
    meta.appendChild(date);

    left.appendChild(mood);
    left.appendChild(meta);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-button';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', 'Delete memory');
    deleteBtn.addEventListener('click', async () => {
      if (!item.id) return;
      if (firebaseConfigured && db) {
        await deleteDoc(doc(db, 'memories', item.id));
      } else {
        memories = memories.filter((m) => m.id !== item.id);
        saveLocalMemories(memories);
        renderMemories();
        renderStickyNote();
      }
    });

    head.appendChild(left);
    head.appendChild(deleteBtn);

    const details = document.createElement('p');
    details.style.margin = '0.35rem 0 0';
    details.style.fontWeight = '800';
    details.style.color = 'rgba(47, 31, 37, 0.82)';
    details.textContent = item.details || '';

    wrapper.appendChild(head);
    wrapper.appendChild(details);
    memoryList.appendChild(wrapper);
  });
};

renderMemories();
renderStickyNote();

if (stickyNote) {
  stickyNote.addEventListener('click', () => {
    const next = pickNextMemory();
    if (!next || !normalizeDate(next)) {
      const memoriesSection = document.getElementById('memories');
      if (memoriesSection) {
        memoriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const isOpen = stickyNote.dataset.open === 'true';
    stickyNote.dataset.open = isOpen ? 'false' : 'true';
    stickyNote.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    if (stickyDetails) stickyDetails.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
  });
}

if (firebaseConfigured && memoriesRef) {
  const memoriesQuery = query(memoriesRef, orderBy('createdAt', 'desc'));
  onSnapshot(memoriesQuery, (snapshot) => {
    memories = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    renderMemories();
    renderStickyNote();
  });
}

if (memoryForm) {
  const dateInput = memoryForm.querySelector('input[type="date"]');
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    dateInput.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }

  memoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(memoryForm);
    const date = String(formData.get('date') || '');
    const title = String(formData.get('title') || '');
    const mood = String(formData.get('mood') || '🎀');
    const details = String(formData.get('details') || '');

    const note = memoryForm.querySelector('.form-note');

    if (firebaseConfigured && memoriesRef) {
      const dateValue = date ? Timestamp.fromDate(new Date(`${date}T00:00:00`)) : null;
      await addDoc(memoriesRef, {
        date,
        dateValue,
        title,
        mood,
        details,
        createdAt: serverTimestamp(),
      });
      if (note) note.textContent = 'Saved to the scrapbook (shared everywhere).';
    } else {
      const newItem = {
        id:
          (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
          `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        date,
        title,
        mood,
        details,
        createdAt: Date.now(),
      };
      memories = [newItem, ...memories].slice(0, 50);
      saveLocalMemories(memories);
      renderMemories();
      renderStickyNote();
      if (note) note.textContent = 'Saved to the scrapbook (local only).';
    }

    memoryForm.reset();
    if (dateInput) {
      const today = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }
  });
}

if (clearMemoriesButton) {
  clearMemoriesButton.addEventListener('click', async () => {
    const ok = window.confirm('Clear all saved memories from this browser?');
    if (!ok) return;

    if (firebaseConfigured && db) {
      const snapshot = await getDocs(collection(db, 'memories'));
      const deletions = snapshot.docs.map((docSnap) => deleteDoc(doc(db, 'memories', docSnap.id)));
      await Promise.all(deletions);
    } else {
      memories = [];
      saveLocalMemories(memories);
      renderMemories();
      renderStickyNote();
    }

    const note = memoryForm ? memoryForm.querySelector('.form-note') : null;
    if (note) note.textContent = 'Scrapbook cleared.';
  });
}

// -----------------------------
// Love Pass Generator
// -----------------------------
const passForm = document.getElementById('pass-form');
const passBadge = document.getElementById('pass-badge');
const passName = document.getElementById('pass-name');
const passNickname = document.getElementById('pass-nickname');
const passFavorite = document.getElementById('pass-favorite');
const passId = document.getElementById('pass-id');

const PASS_KEY = 'mariya_love_pass_v1';
const LEGACY_PASS_KEY = 'mari_love_pass_v1';

const generatePassId = () => {
  const chunk = () => Math.random().toString(16).slice(2, 6).toUpperCase();
  return `MARIYA-${chunk()}-${chunk()}`;
};

const loadPass = () => {
  if (typeof localStorage === 'undefined') return null;

  const primaryRaw = localStorage.getItem(PASS_KEY);
  if (primaryRaw) {
    const parsed = safeJsonParse(primaryRaw, null);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  }

  const legacyRaw = localStorage.getItem(LEGACY_PASS_KEY);
  if (!legacyRaw) return null;
  const legacyParsed = safeJsonParse(legacyRaw, null);
  if (!legacyParsed || typeof legacyParsed !== 'object') return null;
  localStorage.setItem(PASS_KEY, JSON.stringify(legacyParsed));
  return legacyParsed;
};

const savePass = (data) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PASS_KEY, JSON.stringify(data));
};

const renderPass = (data) => {
  if (!data) return;
  if (passBadge) passBadge.textContent = data.vibe || '🎀';
  if (passName) passName.textContent = data.yourName || '—';
  if (passNickname) passNickname.textContent = data.nickname || '—';
  if (passFavorite) passFavorite.textContent = data.favorite || '—';
  if (passId) passId.textContent = data.passId || '—';
};

renderPass(loadPass());

if (passForm) {
  passForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(passForm);
    const data = {
      yourName: String(formData.get('yourName') || ''),
      nickname: String(formData.get('nickname') || ''),
      favorite: String(formData.get('favorite') || ''),
      vibe: String(formData.get('vibe') || '🎀'),
      passId: generatePassId(),
    };

    renderPass(data);
    savePass(data);

    const note = passForm.querySelector('.form-note');
    if (note) note.textContent = 'Pass generated. Now go kiss Mariya.';

    passForm.reset();
  });
}

// -----------------------------
// Mail (mailto:)
// -----------------------------
const mailForm = document.getElementById('mail-form');
const mailToDisplay = document.getElementById('mail-to-display');
const mailDirectLink = document.getElementById('mail-direct-link');
const copyMailButton = document.getElementById('copy-mail');

const getMailTo = () => {
  if (!mailForm) return 'your-email@example.com';
  const raw = String(mailForm.dataset.emailTo || '').trim();
  return raw || 'your-email@example.com';
};

const buildMailDraft = () => {
  if (!mailForm) {
    return {
      subject: 'A note for Mariya',
      body: 'Hi Mariya!\n\n',
    };
  }

  const fd = new FormData(mailForm);
  const fromName = String(fd.get('fromName') || '').trim();
  const fromEmail = String(fd.get('fromEmail') || '').trim();
  const subject = String(fd.get('subject') || 'A note for Mariya').trim();
  const message = String(fd.get('message') || '').trim();

  const lines = [];
  lines.push('Hi Mariya,');
  lines.push('');
  lines.push(message || '(your message here)');
  lines.push('');
  lines.push(`From: ${fromName || '—'}${fromEmail ? ` <${fromEmail}>` : ''}`);
  lines.push('');
  lines.push('(Sent from Mariya\'s Love Club)');

  return {
    subject,
    body: lines.join('\n'),
  };
};

const mailtoUrl = (to, subject, body) => {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  return `mailto:${to}?${params.toString()}`;
};

const setMailUi = () => {
  if (!mailForm) return;
  const to = getMailTo();
  if (mailToDisplay) mailToDisplay.textContent = to;

  if (mailDirectLink) {
    const draft = buildMailDraft();
    mailDirectLink.href = mailtoUrl(to, draft.subject, draft.body);
  }
};

setMailUi();

if (mailForm) {
  mailForm.addEventListener('input', setMailUi);

  mailForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const to = getMailTo();
    const draft = buildMailDraft();

    const note = document.getElementById('mail-note');
    if (note) note.textContent = 'Opening your email app...';

    window.location.href = mailtoUrl(to, draft.subject, draft.body);
  });
}

const copyToClipboard = async (text) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
};

if (copyMailButton && mailForm) {
  copyMailButton.addEventListener('click', async () => {
    const to = getMailTo();
    const draft = buildMailDraft();
    const text = `To: ${to}\nSubject: ${draft.subject}\n\n${draft.body}`;

    const note = document.getElementById('mail-note');

    try {
      await copyToClipboard(text);
      if (note) note.textContent = 'Copied! Paste it into any email app.';
    } catch {
      if (note) note.textContent = 'Copy failed on this device - try "Open Mail App" instead.';
    }
  });
}
