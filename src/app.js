import { renderModeToggle } from './components/modeToggle.js';
import { renderTemplatePicker } from './components/templatePicker.js';
import { renderSchedule } from './components/scheduleRow.js';
import {
  renderDetailSheet,
  refreshDetailSheetBody,
  closeDetailSheet,
  getPendingStaticContentEdit,
} from './components/detailSheet.js';
import { renderModeLog } from './components/modeLog.js';
import { renderNavBar } from './components/navBar.js';
import { showToast, hideToast } from './components/toast.js';
import { shareModeLog } from './components/exportModeLog.js';
import { renderOnboarding } from './components/onboarding.js';
import {
  logMode,
  getMode,
  getLast7Days,
  getAllModeLogEntries,
  getChecklistState,
  setChecklistState,
  getSelectedTemplateId,
  setSelectedTemplateId,
  hasAnyPriorUsage,
  getTypeOverride,
  setTypeOverride,
  getRowText,
  setRowText,
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
const onboardingEl = document.getElementById('onboarding');
const onboardingOptionsEl = document.getElementById('onboarding-options');

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

function isValidChecklistContent(data) {
  return Array.isArray(data) && data.every((group) => group && Array.isArray(group.items));
}

function hasStaticContent(row) {
  return row.detailType === 'reference' || row.detailType === 'plan';
}

function hydrateRows(templateData, templateId) {
  Object.entries(templateData.schedule).forEach(([mode, rows]) => {
    rows.forEach((row) => {
      // 1. Apply checklist attach/detach (independent of any static content
      // the row might have). Always indefinite - a structural decision about
      // the schedule's shape, not day-to-day checklist progress.
      const checklistOverride = getTypeOverride(templateId, mode, row.id);
      if (checklistOverride === 'checklist' && !row.checklist) {
        row.checklist = { persistChecklist: 'indefinite', content: [{ section: null, items: [] }] };
      } else if (checklistOverride === 'none') {
        row.checklist = undefined;
      }

      // 2. Layer the checklist's own content/checked-state persistence on top.
      if (row.checklist && row.checklist.persistChecklist) {
        const saved = getChecklistState(templateId, mode, row.id, row.checklist.persistChecklist);
        if (saved && isValidChecklistContent(saved)) row.checklist.content = saved;
      }

      // 3. Apply any saved free-text edit to static reference/plan content.
      if (hasStaticContent(row)) {
        const savedText = getRowText(templateId, mode, row.id);
        if (typeof savedText === 'string') row.detailContent = savedText;
      }
    });
  });
}

async function loadTemplate(id) {
  if (templateCache.has(id)) return templateCache.get(id);
  const entry = templateIndex.find((t) => t.id === id);
  const data = await fetch(`src/templates/${entry.file}`).then((res) => res.json());
  hydrateRows(data, id);
  templateCache.set(id, data);
  return data;
}

function persistChecklistIfNeeded(row) {
  if (row.checklist && row.checklist.persistChecklist) {
    setChecklistState(currentTemplateId, currentMode, row.id, row.checklist.content, row.checklist.persistChecklist);
  }
}

function saveStaticContent(text) {
  const row = currentRows[openRowIndex];
  if (!row || !hasStaticContent(row)) return;
  row.detailContent = text;
  setRowText(currentTemplateId, currentMode, row.id, text);
}

function flushPendingEdit() {
  if (openRowIndex === null) return;
  const pending = getPendingStaticContentEdit(sheetEls);
  if (pending !== null) saveStaticContent(pending);
}

function closeSheet() {
  flushPendingEdit();
  closeDetailSheet(sheetEls);
  openRowIndex = null;
  editMode = false;
  addingToGroup = null;
  hideToast(toastEls);
}

function refreshSheet() {
  flushPendingEdit();
  const row = currentRows[openRowIndex];
  refreshDetailSheetBody(sheetEls, row, { editMode, addingToGroup }, handlers);
}

function toggleCheck(groupIdx, itemIdx) {
  const row = currentRows[openRowIndex];
  const item = row.checklist.content[groupIdx].items[itemIdx];
  item.checked = !item.checked;
  refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistChecklistIfNeeded(row);
}

function removeItem(groupIdx, itemIdx) {
  const row = currentRows[openRowIndex];
  const [item] = row.checklist.content[groupIdx].items.splice(itemIdx, 1);
  lastRemoved = { row, groupIdx, itemIdx, item };
  refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistChecklistIfNeeded(row);
  showToast(toastEls, `Removed "${item.name}"`, 'Undo', undoRemove);
}

function undoRemove() {
  if (!lastRemoved) return;
  const { row, groupIdx, itemIdx, item } = lastRemoved;
  row.checklist.content[groupIdx].items.splice(itemIdx, 0, item);
  lastRemoved = null;
  if (currentRows[openRowIndex] === row) refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistChecklistIfNeeded(row);
}

function startAdd(groupIdx) {
  addingToGroup = groupIdx;
  refreshSheet();
}

function addItem(groupIdx, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const row = currentRows[openRowIndex];
  row.checklist.content[groupIdx].items.push({ name: trimmed, checked: false });
  refreshSheet();
  renderSchedule(scheduleEl, currentRows, currentMode);
  persistChecklistIfNeeded(row);
}

function updateEditButton(row) {
  const editable = hasStaticContent(row) || !!row.checklist;
  sheetEditBtn.style.display = editable ? '' : 'none';
  sheetEditBtn.textContent = editMode ? 'Done' : 'Edit';
  sheetEditBtn.classList.toggle('active', editMode);
}

function toggleEditMode() {
  const row = currentRows[openRowIndex];
  if (editMode) flushPendingEdit();
  editMode = !editMode;
  addingToGroup = null;
  refreshDetailSheetBody(sheetEls, row, { editMode, addingToGroup }, handlers);
  updateEditButton(row);
}

function assignChecklist() {
  const row = currentRows[openRowIndex];
  row.checklist = { persistChecklist: 'indefinite', content: [{ section: null, items: [] }] };
  setTypeOverride(currentTemplateId, currentMode, row.id, 'checklist');

  editMode = true;
  addingToGroup = 0;
  renderDetailSheet(sheetEls, row, { editMode, addingToGroup }, handlers);
  updateEditButton(row);
  renderSchedule(scheduleEl, currentRows, currentMode);
}

function removeChecklist() {
  const row = currentRows[openRowIndex];
  row.checklist = undefined;
  setTypeOverride(currentTemplateId, currentMode, row.id, 'none');
  addingToGroup = null;
  if (!hasStaticContent(row)) editMode = false;

  renderDetailSheet(sheetEls, row, { editMode, addingToGroup }, handlers);
  updateEditButton(row);
  renderSchedule(scheduleEl, currentRows, currentMode);
}

const handlers = {
  onToggleCheck: toggleCheck,
  onRemoveItem: removeItem,
  onAddItem: addItem,
  onStartAdd: startAdd,
  onAssignChecklist: assignChecklist,
  onRemoveChecklist: removeChecklist,
  onSaveStaticContent: saveStaticContent,
};

function openRow(index) {
  flushPendingEdit();
  const row = currentRows[index];
  openRowIndex = index;
  editMode = false;
  addingToGroup = null;
  hideToast(toastEls);
  renderDetailSheet(sheetEls, row, { editMode, addingToGroup }, handlers);
  updateEditButton(row);
}

async function render() {
  closeSheet();

  try {
    const template = await loadTemplate(currentTemplateId);
    currentRows = template.schedule[currentMode];

    renderTemplatePicker(templatePickerEl, templateIndex, currentTemplateId, selectTemplate);
    renderModeToggle(modeToggleEl, currentMode, selectMode);

    subtitleEl.textContent = template.subtitle;
    modeNoteEl.textContent = modeNotes[currentMode];
    renderSchedule(scheduleEl, currentRows, currentMode);
    renderModeLog(logDaysEl, getLast7Days());
  } catch (err) {
    console.error('Render failed:', err);
    scheduleEl.innerHTML = '<div class="render-error">Something went wrong loading this schedule. Try switching modes or reloading the app.</div>';
  }
}

async function selectTemplate(id) {
  currentTemplateId = id;
  setSelectedTemplateId(id);
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

async function completeOnboarding(id) {
  setSelectedTemplateId(id);
  currentTemplateId = id;
  onboardingEl.style.display = 'none';
  updateView();
  await render();
}

async function init() {
  [templateIndex, modeNotes] = await Promise.all([
    fetch('src/templates/index.json').then((res) => res.json()),
    fetch('src/config/mode-notes.json').then((res) => res.json()),
  ]);

  const loggedToday = getMode(new Date());
  if (loggedToday) currentMode = loggedToday;

  const selected = getSelectedTemplateId();
  const validSelected = selected && templateIndex.some((t) => t.id === selected);

  if (validSelected) {
    currentTemplateId = selected;
    updateView();
    await render();
  } else if (hasAnyPriorUsage()) {
    // Existing user from before template-selection persistence existed — adopt
    // the default silently rather than surprising them with an onboarding gate.
    currentTemplateId = templateIndex[0].id;
    setSelectedTemplateId(currentTemplateId);
    updateView();
    await render();
  } else {
    renderOnboarding(onboardingOptionsEl, templateIndex, completeOnboarding);
    onboardingEl.style.display = 'flex';
  }
}

init();
