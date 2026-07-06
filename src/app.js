import { renderModeToggle } from './components/modeToggle.js';
import { renderTemplatePicker } from './components/templatePicker.js';
import { renderSchedule } from './components/scheduleRow.js';
import { renderDetailSheet, refreshDetailSheetBody, closeDetailSheet } from './components/detailSheet.js';
import { renderModeLog } from './components/modeLog.js';
import { renderNavBar } from './components/navBar.js';
import { logMode, getMode, getLast7Days } from './storage.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch((err) => {
    console.error('Service worker registration failed:', err);
  });
}

const templatePickerEl = document.getElementById('template-picker');
const modeToggleEl = document.getElementById('mode-toggle');
const modeNoteEl = document.getElementById('mode-note');
const subtitleEl = document.getElementById('subtitle');
const scheduleEl = document.getElementById('schedule');

const sheetEls = {
  backdrop: document.getElementById('backdrop'),
  sheet: document.getElementById('sheet'),
  title: document.getElementById('sheet-title'),
  time: document.getElementById('sheet-time'),
  body: document.getElementById('sheet-body'),
};
const sheetCloseBtn = document.getElementById('sheet-close');
const logDaysEl = document.getElementById('log-days');
const navBarEl = document.getElementById('bottom-nav');
const viewEls = {
  today: document.getElementById('view-today'),
  history: document.getElementById('view-history'),
};

let templateIndex = [];
let modeNotes = {};
const templateCache = new Map();

let currentTemplateId = null;
let currentMode = 'full';
let currentRows = [];
let openRowIndex = null;
let currentView = 'today';

function updateView() {
  Object.entries(viewEls).forEach(([id, el]) => {
    el.classList.toggle('active', id === currentView);
  });
  renderNavBar(navBarEl, currentView, selectView);
}

function selectView(view) {
  currentView = view;
  updateView();
}

async function loadTemplate(id) {
  if (templateCache.has(id)) return templateCache.get(id);
  const entry = templateIndex.find((t) => t.id === id);
  const data = await fetch(`src/templates/${entry.file}`).then((res) => res.json());
  templateCache.set(id, data);
  return data;
}

function closeSheet() {
  closeDetailSheet(sheetEls);
  openRowIndex = null;
}

function toggleCheck(itemIdx) {
  const row = currentRows[openRowIndex];
  row.detailContent[itemIdx].checked = !row.detailContent[itemIdx].checked;
  refreshDetailSheetBody(sheetEls, row, toggleCheck);
}

function openRow(index) {
  const row = currentRows[index];
  if (!row.detailType) return;
  openRowIndex = index;
  renderDetailSheet(sheetEls, row, toggleCheck);
}

async function render() {
  closeSheet();

  const template = await loadTemplate(currentTemplateId);
  currentRows = template.schedule[currentMode];

  renderTemplatePicker(templatePickerEl, templateIndex, currentTemplateId, selectTemplate);
  renderModeToggle(modeToggleEl, currentMode, selectMode);

  subtitleEl.textContent = template.subtitle;
  modeNoteEl.textContent = modeNotes[currentMode];
  renderSchedule(scheduleEl, currentRows, currentMode);
  renderModeLog(logDaysEl, getLast7Days());
}

async function selectTemplate(id) {
  currentTemplateId = id;
  await render();
}

async function selectMode(mode) {
  currentMode = mode;
  logMode(mode);
  await render();
}

scheduleEl.addEventListener('click', (e) => {
  const rowEl = e.target.closest('.row[data-index]');
  if (!rowEl) return;
  openRow(Number(rowEl.dataset.index));
});

sheetEls.backdrop.addEventListener('click', closeSheet);
sheetCloseBtn.addEventListener('click', closeSheet);

async function init() {
  [templateIndex, modeNotes] = await Promise.all([
    fetch('src/templates/index.json').then((res) => res.json()),
    fetch('src/config/mode-notes.json').then((res) => res.json()),
  ]);
  currentTemplateId = templateIndex[0].id;

  const loggedToday = getMode(new Date());
  if (loggedToday) currentMode = loggedToday;

  updateView();
  await render();
}

init();
