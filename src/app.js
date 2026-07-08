import { renderModeToggle } from './components/modeToggle.js';
import { renderTemplatePicker } from './components/templatePicker.js';
import { renderSchedule } from './components/scheduleRow.js';
import { renderDetailSheet, refreshDetailSheetBody, closeDetailSheet } from './components/detailSheet.js';
import { renderModeLog } from './components/modeLog.js';
import { renderNavBar } from './components/navBar.js';
import { showToast, hideToast } from './components/toast.js';
import { shareModeLog } from './components/exportModeLog.js';
import {
  logMode,
  getMode,
  getLast7Days,
  getAllModeLogEntries,
  getChecklistState,
  setChecklistState,
} from './storage.js';

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
const sheetEditBtn = document.getElementById('sheet-edit');
const logDaysEl = document.getElementById('log-days');
const exportBtn = document.getElementById('export-log');
const navBarEl = document.getElementById('bottom-nav');
const viewEls = {
  today: document.getElementById('view-today'),
  history: document.getElementById('view-history'),
};
const toastEls = {
  el: document.getElementById('toast'),
  message: document.getElementById('toast-message'),
  undoBtn: document.getElementById('toast-undo'),
};

let templateIndex = [];
let modeNotes = {};
const templateCache = new Map();

let currentTemplateId = null;
let currentMode = 'full';
let currentRows = [];
let openRowIndex = null;
let currentView = 'today';
let editMode = false;
let addingToGroup = null;
let lastRemoved = null;

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

function hydratePersistedChecklists(templateData, templateId) {
  Object.entries(templateData.schedule).forEach(([mode, rows]) => {
    rows.forEach((row) => {
      if (row.detailType !== 'checklist' || !row.persistChecklist) return;
      const saved = getChecklistState(templateId, mode, row.id, row.persistChecklist);
      if (saved) row.detailContent = saved;
    });
  });
}

async function loadTemplate(id) {
  if (templateCache.has(id)) return templateCache.get(id);
  const entry = templateIndex.find((t) => t.id === id);
  const data = await fetch(`src/templates/${entry.file}`).then((res) => res.json());
  hydratePersistedChecklists(data, id);
  templateCache.set(id, data);
  return data;
}

function persistIfNeeded(row) {
  if (row.persistChecklist) {
    setChecklistState(currentTemplateId, currentMode, row.id, row.detailContent, row.persistChecklist);
  }
}

function closeSheet() {
  closeDetailSheet(sheetEls);
  openRowIndex = null;
  editMode = false;
  addingToGroup = null;
  hideToast(toastEls);
}

function refreshSheet() {
  const row = currentRows[openRowIndex];
  refreshDetailSheetBody(sheetEls, row, { editMode, addingToGroup }, handlers);
}

function toggleCheck(groupIdx, itemIdx) {
  const row = currentRows[openRowIndex];
  const item = row.detailContent[groupIdx].items[itemIdx];
  item.checked = !item.checked;
  refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistIfNeeded(row);
}

function removeItem(groupIdx, itemIdx) {
  const row = currentRows[openRowIndex];
  const [item] = row.detailContent[groupIdx].items.splice(itemIdx, 1);
  lastRemoved = { row, groupIdx, itemIdx, item };
  refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistIfNeeded(row);
  showToast(toastEls, `Removed "${item.name}"`, 'Undo', undoRemove);
}

function undoRemove() {
  if (!lastRemoved) return;
  const { row, groupIdx, itemIdx, item } = lastRemoved;
  row.detailContent[groupIdx].items.splice(itemIdx, 0, item);
  lastRemoved = null;
  if (currentRows[openRowIndex] === row) refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistIfNeeded(row);
}

function startAdd(groupIdx) {
  addingToGroup = groupIdx;
  refreshSheet();
}

function addItem(groupIdx, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const row = currentRows[openRowIndex];
  row.detailContent[groupIdx].items.push({ name: trimmed, checked: false });
  refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistIfNeeded(row);
}

function toggleEditMode() {
  editMode = !editMode;
  addingToGroup = null;
  refreshSheet();
  sheetEditBtn.textContent = editMode ? 'Done' : 'Edit';
  sheetEditBtn.classList.toggle('active', editMode);
}

const handlers = {
  onToggleCheck: toggleCheck,
  onRemoveItem: removeItem,
  onAddItem: addItem,
  onStartAdd: startAdd,
};

function openRow(index) {
  const row = currentRows[index];
  if (!row.detailType) return;
  openRowIndex = index;
  editMode = false;
  addingToGroup = null;
  hideToast(toastEls);
  renderDetailSheet(sheetEls, row, { editMode, addingToGroup }, handlers);
  sheetEditBtn.style.display = row.detailType === 'checklist' ? '' : 'none';
  sheetEditBtn.textContent = 'Edit';
  sheetEditBtn.classList.remove('active');
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
sheetEditBtn.addEventListener('click', toggleEditMode);
exportBtn.addEventListener('click', () => shareModeLog(getAllModeLogEntries(), toastEls));

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
