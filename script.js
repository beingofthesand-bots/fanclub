const yearEl = document.getElementById('year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
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
// Memory Scrapbook (localStorage)
// -----------------------------
const memoryForm = document.getElementById('memory-form');
const memoryList = document.getElementById('memory-list');
const clearMemoriesButton = document.getElementById('clear-memories');

const MEMORIES_KEY = 'mariya_love_club_memories_v1';
const LEGACY_MEMORIES_KEY = 'mari_love_club_memories_v1';

const loadMemories = () => {
  if (typeof localStorage === 'undefined') return [];

  const primaryRaw = localStorage.getItem(MEMORIES_KEY);
  if (primaryRaw) {
    const parsed = safeJsonParse(primaryRaw, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  // Migrate from older key.
  const legacyRaw = localStorage.getItem(LEGACY_MEMORIES_KEY);
  if (!legacyRaw) return [];
  const legacyParsed = safeJsonParse(legacyRaw, []);
  const items = Array.isArray(legacyParsed) ? legacyParsed : [];
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(items));
  return items;
};

const saveMemories = (items) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MEMORIES_KEY, JSON.stringify(items));
};

const friendlyDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

let memories = loadMemories();

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
    date.textContent = friendlyDate(item.date);

    meta.appendChild(title);
    meta.appendChild(date);

    left.appendChild(mood);
    left.appendChild(meta);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'icon-button';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', 'Delete memory');
    deleteBtn.addEventListener('click', () => {
      memories = memories.filter((m) => m.id !== item.id);
      saveMemories(memories);
      renderMemories();
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

if (memoryForm) {
  const dateInput = memoryForm.querySelector('input[type="date"]');
  if (dateInput && !dateInput.value) {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    dateInput.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }

  memoryForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(memoryForm);
    const newItem = {
      id:
        (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: String(formData.get('date') || ''),
      title: String(formData.get('title') || ''),
      mood: String(formData.get('mood') || '🎀'),
      details: String(formData.get('details') || ''),
    };

    memories = [newItem, ...memories].slice(0, 50);
    saveMemories(memories);
    renderMemories();

    const note = memoryForm.querySelector('.form-note');
    if (note) note.textContent = 'Saved to the scrapbook (with bows).';

    memoryForm.reset();
    if (dateInput) {
      const today = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      dateInput.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    }
  });
}

if (clearMemoriesButton) {
  clearMemoriesButton.addEventListener('click', () => {
    const ok = window.confirm('Clear all saved memories from this browser?');
    if (!ok) return;
    memories = [];
    saveMemories(memories);
    renderMemories();
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

  // Migrate from older key.
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
      if (note) note.textContent = 'Copy failed on this device - try \"Open Mail App\" instead.';
    }
  });
}
