import { renderModeToggle } from './components/modeToggle.js';
import { renderSchedule } from './components/scheduleRow.js';
import {
  renderDetailSheet,
  refreshDetailSheetBody,
  closeDetailSheet,
  getPendingStaticContentEdit,
} from './components/detailSheet.js';
import { renderModeLog, renderFullHistory } from './components/modeLog.js';
import { renderNavBar } from './components/navBar.js';
import { showToast, hideToast } from './components/toast.js';
import { shareModeLog } from './components/exportModeLog.js';
import { renderOnboarding } from './components/onboarding.js';
import { renderTemplatesList } from './components/templatesList.js';
import { renderAnchorList } from './components/templateBuilder.js';
import { parse24hTime, formatDisplayTime, insertRowByTime } from './timeUtils.js';
import { trapFocus, releaseFocus } from './focusTrap.js';
import { buildBackupJson, restoreFromBackupJson } from './backup.js';
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
  getCustomTemplateIds,
  getCustomTemplate,
  saveCustomTemplate,
  deleteCustomTemplate,
  cleanupOldDailyKeys,
} from './storage.js';

// Bumped by hand alongside service-worker.js's CACHE_NAME on every commit -
// there's no build step to stamp this automatically, so the number is the
// single source of truth for "what did I last touch," matched to the cache
// version so the two can be cross-referenced against the commit log.
const APP_VERSION = 'v49 · 2026-07-09';

const updateBannerEl = document.getElementById('update-banner');
const updateBannerBtn = document.getElementById('update-banner-btn');
const offlineBannerEl = document.getElementById('offline-banner');
const versionFooterEl = document.getElementById('version-footer');
versionFooterEl.textContent = APP_VERSION;
const storageUsageEl = document.getElementById('storage-usage');

updateBannerBtn.addEventListener('click', () => window.location.reload());

function updateOfflineBanner() {
  offlineBannerEl.classList.toggle('open', !navigator.onLine);
}
updateOfflineBanner();
window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // A controller already existing means this is a genuine update to
          // an already-running app, not the very first install (which also
          // fires 'updatefound'/'installed' but has no prior controller).
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            updateBannerEl.classList.add('open');
          }
        });
      });
    })
    .catch((err) => {
      console.error('Service worker registration failed:', err);
    });
}

const modeToggleEl = document.getElementById('mode-toggle');
const modeNoteEl = document.getElementById('mode-note');
const subtitleEl = document.getElementById('subtitle');
const scheduleEl = document.getElementById('schedule');
const scheduleToolsEl = document.getElementById('schedule-tools');
const scheduleEditBtn = document.getElementById('schedule-edit-btn');
const addRowContainerEl = document.getElementById('add-row-container');

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
const historyListEl = document.getElementById('history-list');
const historyFilterSelectEl = document.getElementById('history-filter-select');
const checklistLiveRegionEl = document.getElementById('checklist-live-region');
const exportBtn = document.getElementById('export-log');
const navBarEl = document.getElementById('bottom-nav');
const viewEls = {
  today: document.getElementById('view-today'),
  history: document.getElementById('view-history'),
  templates: document.getElementById('view-templates'),
};
const toastEls = {
  el: document.getElementById('toast'),
  message: document.getElementById('toast-message'),
  undoBtn: document.getElementById('toast-undo'),
};
const onboardingEl = document.getElementById('onboarding');
const onboardingOptionsEl = document.getElementById('onboarding-options');

const templatesListEl = document.getElementById('templates-list');
const newTemplateBtn = document.getElementById('new-template-btn');
const resetDataBtn = document.getElementById('reset-data-btn');
const backupExportBtn = document.getElementById('backup-export-btn');
const backupImportBtn = document.getElementById('backup-import-btn');
const backupImportInput = document.getElementById('backup-import-input');
const confirmDialogBackdrop = document.getElementById('confirm-dialog-backdrop');
const confirmDialogEl = document.getElementById('confirm-dialog');
const confirmDialogText = document.getElementById('confirm-dialog-text');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmProceedBtn = document.getElementById('confirm-proceed-btn');
const confirmDialogTypedEl = document.getElementById('confirm-dialog-typed');
const confirmDialogTypedLabelEl = document.getElementById('confirm-dialog-typed-label');
const confirmDialogTypedInputEl = document.getElementById('confirm-dialog-typed-input');
const templateBuilderEl = document.getElementById('template-builder');
const builderStepName = document.getElementById('builder-step-name');
const builderStepAnchors = document.getElementById('builder-step-anchors');
const builderNameInput = document.getElementById('builder-name-input');
const builderAnchorListEl = document.getElementById('builder-anchor-list');
const builderAnchorLabelInput = document.getElementById('builder-anchor-label');
const builderAnchorTimeInput = document.getElementById('builder-anchor-time');
const builderNameErrorEl = document.getElementById('builder-name-error');
const builderAnchorErrorEl = document.getElementById('builder-anchor-error');
const builderSaveBtn = document.getElementById('builder-save-btn');

let staticTemplateIndex = [];
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
let scheduleEditMode = false;
let editingRowIndex = null;
let lastDeletedRow = null;
let builderName = '';
let builderAnchors = [];
let renamingTemplateId = null;
let historyFilterMonth = 'all';

function updateView() {
  Object.entries(viewEls).forEach(([id, el]) => {
    el.classList.toggle('active', id === currentView);
  });
  renderNavBar(navBarEl, currentView, selectView);
}

function selectView(view) {
  currentView = view;
  if (view === 'templates') renderTemplatesTab();
  updateView();
}

function isValidChecklistContent(data) {
  return Array.isArray(data) && data.every((group) => group && Array.isArray(group.items));
}

function hasStaticContent(row) {
  return row.detailType === 'reference' || row.detailType === 'plan';
}

function isCurrentTemplateCustom() {
  const entry = templateIndex.find((t) => t.id === currentTemplateId);
  return !!(entry && entry.isCustom);
}

function refreshSchedule() {
  renderSchedule(scheduleEl, currentRows, currentMode, scheduleEditMode, isCurrentTemplateCustom(), editingRowIndex);
}

function buildMergedTemplateIndex() {
  const customEntries = getCustomTemplateIds().map((id) => {
    const data = getCustomTemplate(id);
    return {
      id,
      file: null,
      label: data ? data.name : id,
      sublabel: '',
      description: data ? data.subtitle : '',
      isCustom: true,
    };
  });
  templateIndex = [...staticTemplateIndex, ...customEntries];
}

// Rows with a `weeklySchedule` show different content on different days of
// the week (e.g. Prayer-Anchored's Exercise row: real content some days,
// an Upper Body placeholder others, a rest-day message on Sunday). The
// variant is picked from the device's actual current day and swapped into
// the row's normal detailType/detailContent/checklist shape, so everything
// downstream (rendering, persistence) treats it like any other row.
function applyWeeklyVariant(row) {
  if (!row.weeklySchedule || !row.variants) return;
  const dayOfWeek = String(new Date().getDay());
  const variant = row.variants[row.weeklySchedule[dayOfWeek]];
  if (!variant) return;

  row.note = variant.note !== undefined ? variant.note : row.note;
  if (variant.checklist) {
    row.checklist = JSON.parse(JSON.stringify(variant.checklist));
    row.detailType = undefined;
    row.detailContent = undefined;
  } else if (variant.detailType) {
    row.detailType = variant.detailType;
    row.detailContent = variant.detailContent;
    row.checklist = undefined;
  } else {
    row.checklist = undefined;
    row.detailType = undefined;
    row.detailContent = undefined;
  }
}

function hydrateRows(templateData, templateId) {
  Object.entries(templateData.schedule).forEach(([mode, rows]) => {
    rows.forEach((row) => {
      const weeklyManaged = !!row.weeklySchedule;

      if (weeklyManaged) {
        applyWeeklyVariant(row);
      } else {
        // 1. Apply checklist attach/detach (independent of any static content
        // the row might have). Always indefinite - a structural decision about
        // the schedule's shape, not day-to-day checklist progress.
        const checklistOverride = getTypeOverride(templateId, mode, row.id);
        if (checklistOverride === 'checklist' && !row.checklist) {
          row.checklist = { persistChecklist: 'indefinite', content: [{ section: null, items: [] }] };
        } else if (checklistOverride === 'none') {
          row.checklist = undefined;
        }
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
  let data;
  if (entry && entry.isCustom) {
    data = getCustomTemplate(id);
  } else {
    data = await fetch(`src/templates/${entry.file}`).then((res) => res.json());
    hydrateRows(data, id);
  }
  templateCache.set(id, data);
  return data;
}

function persistCustomTemplateIfNeeded() {
  if (!isCurrentTemplateCustom()) return;
  const data = templateCache.get(currentTemplateId);
  if (!data) return;
  if (!saveCustomTemplate(currentTemplateId, data)) {
    showToast(toastEls, 'Could not save — try again', null, null);
  }
}

function persistChecklistIfNeeded(row) {
  if (isCurrentTemplateCustom()) {
    persistCustomTemplateIfNeeded();
    return;
  }
  if (row.checklist && row.checklist.persistChecklist) {
    const ok = setChecklistState(currentTemplateId, currentMode, row.id, row.checklist.content, row.checklist.persistChecklist);
    if (!ok) showToast(toastEls, 'Could not save — try again', null, null);
  }
}

function saveStaticContent(text) {
  const row = currentRows[openRowIndex];
  if (!row || !hasStaticContent(row)) return;
  row.detailContent = text;
  if (isCurrentTemplateCustom()) {
    persistCustomTemplateIfNeeded();
  } else if (!setRowText(currentTemplateId, currentMode, row.id, text)) {
    showToast(toastEls, 'Could not save — try again', null, null);
  }
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
  releaseFocus();
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
  // refreshSheet() below replaces the checkbox with a brand-new DOM node
  // rather than toggling the existing one's .checked property, so the
  // browser never fires the native state-change notification VoiceOver
  // relies on - announce it explicitly instead.
  checklistLiveRegionEl.textContent = `${item.name}, ${item.checked ? 'checked' : 'unchecked'}`;
  refreshSheet();
  refreshSchedule();
  persistChecklistIfNeeded(row);
}

function removeItem(groupIdx, itemIdx) {
  const row = currentRows[openRowIndex];
  const [item] = row.checklist.content[groupIdx].items.splice(itemIdx, 1);
  lastRemoved = { row, groupIdx, itemIdx, item };
  refreshSheet();
  refreshSchedule();
  persistChecklistIfNeeded(row);
  showToast(toastEls, `Removed "${item.name}"`, 'Undo', undoRemove);
}

function undoRemove() {
  if (!lastRemoved) return;
  const { row, groupIdx, itemIdx, item } = lastRemoved;
  row.checklist.content[groupIdx].items.splice(itemIdx, 0, item);
  lastRemoved = null;
  if (currentRows[openRowIndex] === row) refreshSheet();
  refreshSchedule();
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
  refreshSchedule();
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
  if (isCurrentTemplateCustom()) {
    persistCustomTemplateIfNeeded();
  } else if (!setTypeOverride(currentTemplateId, currentMode, row.id, 'checklist')) {
    showToast(toastEls, 'Could not save — try again', null, null);
  }

  editMode = true;
  addingToGroup = 0;
  renderDetailSheet(sheetEls, row, { editMode, addingToGroup }, handlers);
  updateEditButton(row);
  refreshSchedule();
}

function removeChecklist() {
  const row = currentRows[openRowIndex];
  row.checklist = undefined;
  if (isCurrentTemplateCustom()) {
    persistCustomTemplateIfNeeded();
  } else if (!setTypeOverride(currentTemplateId, currentMode, row.id, 'none')) {
    showToast(toastEls, 'Could not save — try again', null, null);
  }
  addingToGroup = null;
  if (!hasStaticContent(row)) editMode = false;

  renderDetailSheet(sheetEls, row, { editMode, addingToGroup }, handlers);
  updateEditButton(row);
  refreshSchedule();
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
  trapFocus(sheetEls.sheet, { onEscape: closeSheet });
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateTemplateId(name) {
  return `custom-${slugify(name) || 'template'}-${Date.now().toString(36)}`;
}

function generateRowId(title) {
  return `${slugify(title) || 'row'}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

// ---- Schedule editing (custom templates only) ----

function updateScheduleTools() {
  const custom = isCurrentTemplateCustom();
  scheduleToolsEl.style.display = custom ? '' : 'none';
  if (!custom) scheduleEditMode = false;
  scheduleEditBtn.textContent = scheduleEditMode ? 'Done' : 'Edit Schedule';
  scheduleEditBtn.classList.toggle('active', scheduleEditMode);
}

function renderAddRowForm() {
  if (!scheduleEditMode || !isCurrentTemplateCustom()) {
    addRowContainerEl.innerHTML = '';
    return;
  }
  addRowContainerEl.innerHTML = `
    <div class="add-row-form">
      <input type="time" id="add-row-time" class="builder-time-input" aria-label="New row time">
      <input type="text" id="add-row-title" class="builder-text-input" placeholder="Task name" aria-label="New row title">
      <button class="add-row-confirm-btn" id="add-row-confirm">Add</button>
    </div>
  `;
  const timeInput = document.getElementById('add-row-time');
  const titleInput = document.getElementById('add-row-title');
  function confirmAddRow() {
    const title = titleInput.value.trim();
    if (!timeInput.value || !title) return;
    const newRow = {
      time: formatDisplayTime(parse24hTime(timeInput.value)),
      title,
      isAnchor: false,
      note: '',
      id: generateRowId(title),
    };
    insertRowByTime(currentRows, newRow);
    persistCustomTemplateIfNeeded();
    refreshSchedule();
    renderAddRowForm();
  }
  document.getElementById('add-row-confirm').addEventListener('click', confirmAddRow);
  [timeInput, titleInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmAddRow();
      }
    });
  });
}

function toggleScheduleEditMode() {
  scheduleEditMode = !scheduleEditMode;
  editingRowIndex = null;
  updateScheduleTools();
  refreshSchedule();
  renderAddRowForm();
}

function deleteRow(index) {
  if (!isCurrentTemplateCustom()) return;
  const [removed] = currentRows.splice(index, 1);
  lastDeletedRow = { index, row: removed };
  editingRowIndex = null;
  persistCustomTemplateIfNeeded();
  refreshSchedule();
  showToast(toastEls, `Removed "${removed.title}"`, 'Undo', undoDeleteRow);
}

function undoDeleteRow() {
  if (!lastDeletedRow) return;
  currentRows.splice(lastDeletedRow.index, 0, lastDeletedRow.row);
  lastDeletedRow = null;
  editingRowIndex = null;
  persistCustomTemplateIfNeeded();
  refreshSchedule();
}

function startEditRow(index) {
  editingRowIndex = index;
  refreshSchedule();
}

function cancelEditRow() {
  editingRowIndex = null;
  refreshSchedule();
}

function saveEditRow(index) {
  const form = scheduleEl.querySelector(`.row-edit-form[data-index="${index}"]`);
  if (!form) return;
  const timeInput = form.querySelector('.row-edit-time');
  const titleInput = form.querySelector('.row-edit-title');
  const title = titleInput.value.trim();
  if (!timeInput.value || !title) return;

  const [row] = currentRows.splice(index, 1);
  row.time = formatDisplayTime(parse24hTime(timeInput.value));
  row.title = title;
  insertRowByTime(currentRows, row);

  editingRowIndex = null;
  persistCustomTemplateIfNeeded();
  refreshSchedule();
}

// ---- Templates tab ----

function renderTemplatesTab() {
  renderTemplatesList(templatesListEl, templateIndex, currentTemplateId, renamingTemplateId, {
    onSelect: selectTemplateFromList,
    onDelete: deleteTemplate,
    onStartRename: startRenameTemplate,
    onSaveRename: saveRenameTemplate,
    onCancelRename: cancelRenameTemplate,
    onDuplicate: duplicateTemplate,
  });
  renderStorageUsage();
}

function formatStorageSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function renderStorageUsage() {
  // localStorage has no size API - approximate as UTF-16 bytes (2 per
  // character) across every key+value this origin has stored. Good enough
  // for "roughly how much," not meant to be exact.
  let chars = 0;
  Object.keys(localStorage).forEach((key) => {
    chars += key.length + (localStorage.getItem(key) || '').length;
  });
  storageUsageEl.textContent = `Using ~${formatStorageSize(chars * 2)} of local storage`;
}

async function selectTemplateFromList(id) {
  renamingTemplateId = null;
  await selectTemplate(id);
  currentView = 'today';
  updateView();
}

function startRenameTemplate(id) {
  renamingTemplateId = id;
  renderTemplatesTab();
}

function cancelRenameTemplate() {
  renamingTemplateId = null;
  renderTemplatesTab();
}

function saveRenameTemplate(id, newName) {
  const trimmed = newName.trim();
  if (!trimmed) return;
  const data = getCustomTemplate(id);
  if (!data) return;
  const oldName = data.name;
  renamingTemplateId = null;
  if (oldName === trimmed) {
    renderTemplatesTab();
    return;
  }
  data.name = trimmed;
  if (!saveCustomTemplate(id, data)) {
    showToast(toastEls, 'Could not save — try again', null, null);
    return;
  }
  templateCache.set(id, data);
  buildMergedTemplateIndex();
  renderTemplatesTab();
  showToast(toastEls, `Renamed to "${trimmed}"`, 'Undo', () => undoRenameTemplate(id, oldName));
}

function undoRenameTemplate(id, oldName) {
  const data = getCustomTemplate(id);
  if (!data) return;
  data.name = oldName;
  if (!saveCustomTemplate(id, data)) {
    showToast(toastEls, 'Could not undo — try again', null, null);
    return;
  }
  templateCache.set(id, data);
  buildMergedTemplateIndex();
  renderTemplatesTab();
}

let duplicateInFlight = false;

async function duplicateTemplate(id) {
  // The duplicate button is a fresh DOM node re-rendered by renderTemplatesTab
  // well before this function's only await, so a same-button double-tap is
  // already unlikely to land twice - but a module-level flag is cheap and
  // makes that guarantee explicit rather than relying on render timing.
  if (duplicateInFlight) return;
  duplicateInFlight = true;
  try {
    const data = getCustomTemplate(id);
    if (!data) return;
    const cloned = JSON.parse(JSON.stringify(data));
    const newId = generateTemplateId(data.name);
    cloned.id = newId;
    cloned.name = `${data.name} (Copy)`;
    ['full', 'recovery'].forEach((mode) => {
      (cloned.schedule[mode] || []).forEach((row) => {
        row.id = generateRowId(row.title);
      });
    });
    if (!saveCustomTemplate(newId, cloned)) {
      showToast(toastEls, 'Could not duplicate — try again', null, null);
      return;
    }
    templateCache.set(newId, cloned);
    buildMergedTemplateIndex();
    const previousTemplateId = currentTemplateId;
    currentTemplateId = newId;
    setSelectedTemplateId(newId);
    currentView = 'today';
    updateView();
    await render();
    showToast(toastEls, `Duplicated as "${cloned.name}"`, 'Undo', () => undoDuplicateTemplate(newId, previousTemplateId));
  } catch (err) {
    console.error('Template duplication failed:', err);
    showToast(toastEls, 'Could not duplicate — try again', null, null);
  } finally {
    duplicateInFlight = false;
  }
}

async function undoDuplicateTemplate(newId, previousTemplateId) {
  deleteCustomTemplate(newId);
  templateCache.delete(newId);
  buildMergedTemplateIndex();
  currentTemplateId = previousTemplateId;
  setSelectedTemplateId(previousTemplateId);
  await render();
}

function deleteTemplate(id) {
  try {
    const data = getCustomTemplate(id);
    if (!data) return;
    const wasActive = currentTemplateId === id;
    if (renamingTemplateId === id) renamingTemplateId = null;
    deleteCustomTemplate(id);
    templateCache.delete(id);
    buildMergedTemplateIndex();
    renderTemplatesTab();

    if (wasActive) {
      const fallback = staticTemplateIndex[0].id;
      currentTemplateId = fallback;
      setSelectedTemplateId(fallback);
      render();
    }

    showToast(toastEls, `Deleted "${data.name}"`, 'Undo', () => undoDeleteTemplate(id, data, wasActive));
  } catch (err) {
    console.error('Template deletion failed:', err);
    showToast(toastEls, 'Could not delete template — try again', null, null);
  }
}

function undoDeleteTemplate(id, data, wasActive) {
  if (!saveCustomTemplate(id, data)) {
    showToast(toastEls, 'Could not restore template — try again', null, null);
    return;
  }
  templateCache.set(id, data);
  buildMergedTemplateIndex();
  renderTemplatesTab();
  if (wasActive) {
    currentTemplateId = id;
    setSelectedTemplateId(id);
    render();
  }
}

// ---- Generic confirm dialog ----

let pendingConfirmAction = null;

let requiredTypedWord = null;

// options.requireTyped: a word the user must type exactly (case-insensitive)
// before Confirm becomes clickable - for actions destructive enough that a
// single mistaken tap (or a double-tap racing past the usual confirm) would
// be a real loss, not just an inconvenience.
function showConfirmDialog(text, onConfirm, options = {}) {
  confirmDialogText.textContent = text;
  pendingConfirmAction = onConfirm;
  requiredTypedWord = options.requireTyped || null;

  if (requiredTypedWord) {
    confirmDialogTypedLabelEl.textContent = `Type ${requiredTypedWord} to confirm`;
    confirmDialogTypedInputEl.value = '';
    confirmDialogTypedEl.style.display = '';
    confirmProceedBtn.disabled = true;
  } else {
    confirmDialogTypedEl.style.display = 'none';
    confirmProceedBtn.disabled = false;
  }

  confirmDialogBackdrop.classList.add('open');
  trapFocus(confirmDialogEl, { onEscape: closeConfirmDialog });
}

function closeConfirmDialog() {
  confirmDialogBackdrop.classList.remove('open');
  pendingConfirmAction = null;
  requiredTypedWord = null;
  confirmDialogTypedEl.style.display = 'none';
  confirmProceedBtn.disabled = false;
  releaseFocus();
  // The confirm dialog can open on top of the template builder (discard-
  // progress prompt) - trapFocus only tracks one active trap, so opening
  // this one silently replaced the builder's. If the builder is still open
  // (i.e. the user cancelled rather than confirmed discard), re-trap it so
  // Tab doesn't escape to content hidden behind it.
  if (templateBuilderEl.style.display === 'flex') {
    trapFocus(templateBuilderEl, { onEscape: requestCloseTemplateBuilder });
  }
}

confirmCancelBtn.addEventListener('click', closeConfirmDialog);
confirmDialogBackdrop.addEventListener('click', (e) => {
  if (e.target === confirmDialogBackdrop) closeConfirmDialog();
});
confirmDialogTypedInputEl.addEventListener('input', () => {
  if (!requiredTypedWord) return;
  confirmProceedBtn.disabled = confirmDialogTypedInputEl.value.trim().toUpperCase() !== requiredTypedWord.toUpperCase();
});
confirmDialogTypedInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !confirmProceedBtn.disabled) {
    e.preventDefault();
    confirmProceedBtn.click();
  }
});
confirmProceedBtn.addEventListener('click', () => {
  const action = pendingConfirmAction;
  closeConfirmDialog();
  if (action) action();
});

// ---- Reset app data ----

function resetAppData() {
  try {
    localStorage.clear();
  } catch (err) {
    console.error('Reset failed:', err);
    showToast(toastEls, 'Could not reset — try again', null, null);
    return;
  }
  window.location.reload();
}

resetDataBtn.addEventListener('click', () => {
  showConfirmDialog(
    'This permanently and irreversibly deletes every template, checklist, and mode-log entry on this device. There is no undo, and no way to recover this data afterward unless you have a backup file. Export a backup first if you want one.',
    resetAppData,
    { requireTyped: 'RESET' }
  );
});

// ---- Backup & restore ----

async function exportBackup() {
  // Every path here awaits a share/clipboard call, leaving the button
  // clickable in the meantime - a fast double-tap could otherwise open two
  // overlapping native share sheets.
  if (backupExportBtn.disabled) return;
  backupExportBtn.disabled = true;
  try {
    const json = buildBackupJson();
    const filename = `adaptive-routine-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Adaptive Daily Routine Backup' });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Backup file share failed:', err);
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Adaptive Daily Routine Backup', text: json });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Backup text share failed:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(json);
      showToast(toastEls, 'Backup copied to clipboard', null, null);
    } catch (err) {
      console.error('Backup clipboard copy failed:', err);
      showToast(toastEls, 'Could not export backup — try again', null, null);
    }
  } finally {
    backupExportBtn.disabled = false;
  }
}

function importBackup() {
  backupImportInput.value = '';
  backupImportInput.click();
}

function restoreBackup(text) {
  try {
    restoreFromBackupJson(text);
  } catch (err) {
    console.error('Backup restore failed:', err);
    showToast(toastEls, err.message || 'Could not restore backup — try again', null, null);
    return;
  }
  window.location.reload();
}

backupExportBtn.addEventListener('click', exportBackup);
backupImportBtn.addEventListener('click', importBackup);
backupImportInput.addEventListener('change', () => {
  const file = backupImportInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    showConfirmDialog(
      'This replaces every template, checklist, and mode-log entry currently on this device with the contents of this backup file. This cannot be undone.',
      () => restoreBackup(reader.result)
    );
  };
  reader.onerror = () => {
    console.error('Backup file read failed:', reader.error);
    showToast(toastEls, 'Could not read that file — try again', null, null);
  };
  reader.readAsText(file);
});

// ---- New Template builder flow ----

function openTemplateBuilder() {
  builderName = '';
  builderAnchors = [];
  builderNameInput.value = '';
  builderAnchorLabelInput.value = '';
  builderAnchorTimeInput.value = '';
  builderNameErrorEl.textContent = '';
  builderAnchorErrorEl.textContent = '';
  builderStepName.style.display = '';
  builderStepAnchors.style.display = 'none';
  renderAnchorList(builderAnchorListEl, builderAnchors, removeBuilderAnchor);
  templateBuilderEl.style.display = 'flex';
  trapFocus(templateBuilderEl, { onEscape: requestCloseTemplateBuilder });
}

function closeTemplateBuilder() {
  templateBuilderEl.style.display = 'none';
  releaseFocus();
}

function hasUnsavedBuilderProgress() {
  return builderNameInput.value.trim() !== '' || builderAnchors.length > 0;
}

// Cancel/Escape from either builder step routes through here rather than
// straight to closeTemplateBuilder, so typed-in progress isn't silently
// thrown away by one accidental tap. A still-empty builder (nothing typed
// yet) has nothing to lose, so it closes immediately without a prompt.
function requestCloseTemplateBuilder() {
  if (!hasUnsavedBuilderProgress()) {
    closeTemplateBuilder();
    return;
  }
  showConfirmDialog('Discard this new template? Your progress will be lost.', closeTemplateBuilder);
}

function goToAnchorStep() {
  const name = builderNameInput.value.trim();
  if (!name) {
    builderNameErrorEl.textContent = 'Enter a name for this template.';
    return;
  }
  builderNameErrorEl.textContent = '';
  builderName = name;
  builderStepName.style.display = 'none';
  builderStepAnchors.style.display = '';
  builderAnchorTimeInput.focus();
}

function addBuilderAnchor() {
  const label = builderAnchorLabelInput.value.trim();
  const time24 = builderAnchorTimeInput.value;
  if (!label || !time24) {
    builderAnchorErrorEl.textContent = 'Enter both a label and a time.';
    return;
  }
  const isDuplicate = builderAnchors.some((a) => a.label.toLowerCase() === label.toLowerCase());
  if (isDuplicate) {
    builderAnchorErrorEl.textContent = `An anchor named "${label}" already exists.`;
    return;
  }
  builderAnchorErrorEl.textContent = '';
  builderAnchors.push({ label, displayTime: formatDisplayTime(parse24hTime(time24)) });
  renderAnchorList(builderAnchorListEl, builderAnchors, removeBuilderAnchor);
  builderAnchorLabelInput.value = '';
  builderAnchorLabelInput.focus();
}

function removeBuilderAnchor(idx) {
  builderAnchors.splice(idx, 1);
  renderAnchorList(builderAnchorListEl, builderAnchors, removeBuilderAnchor);
}

async function createCustomTemplate(name, anchors) {
  const freshGeneric = await fetch('src/templates/generic.json').then((res) => res.json());
  const cloned = JSON.parse(JSON.stringify(freshGeneric));
  const id = generateTemplateId(name);

  ['full', 'recovery'].forEach((mode) => {
    anchors.forEach((a) => {
      const row = { time: a.displayTime, title: a.label, isAnchor: true, note: '', id: generateRowId(a.label) };
      insertRowByTime(cloned.schedule[mode], row);
    });
  });

  const customTemplate = { id, name, subtitle: 'Custom template', schedule: cloned.schedule };
  saveCustomTemplate(id, customTemplate);
  return id;
}

async function saveNewTemplate() {
  // createCustomTemplate awaits a fetch, leaving this button clickable for
  // that whole window - a fast double-tap before it resolves would otherwise
  // fire this twice and create two templates from one tap.
  if (builderSaveBtn.disabled) return;
  builderSaveBtn.disabled = true;
  try {
    const id = await createCustomTemplate(builderName, builderAnchors);
    buildMergedTemplateIndex();
    closeTemplateBuilder();
    currentTemplateId = id;
    setSelectedTemplateId(id);
    currentView = 'today';
    updateView();
    await render();
  } catch (err) {
    console.error('Template creation failed:', err);
    showToast(toastEls, 'Could not create template — try again', null, null);
  } finally {
    builderSaveBtn.disabled = false;
  }
}

function refreshHistory() {
  const entries = getAllModeLogEntries();
  const months = [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse();
  const options = ['<option value="all">All time</option>'].concat(
    months.map((m) => {
      const [y, mo] = m.split('-').map(Number);
      const label = new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      return `<option value="${m}">${label}</option>`;
    })
  );
  historyFilterSelectEl.innerHTML = options.join('');
  historyFilterSelectEl.value = historyFilterMonth;

  const filtered = historyFilterMonth === 'all' ? entries : entries.filter((e) => e.date.startsWith(historyFilterMonth));
  renderFullHistory(historyListEl, filtered);
}

historyFilterSelectEl.addEventListener('change', () => {
  historyFilterMonth = historyFilterSelectEl.value;
  refreshHistory();
});

async function render() {
  closeSheet();
  scheduleEditMode = false;
  editingRowIndex = null;

  try {
    const template = await loadTemplate(currentTemplateId);
    currentRows = template.schedule[currentMode];

    renderModeToggle(modeToggleEl, currentMode, selectMode);

    subtitleEl.textContent = template.subtitle;
    modeNoteEl.textContent = modeNotes[currentMode];
    updateScheduleTools();
    refreshSchedule();
    renderAddRowForm();
    renderModeLog(logDaysEl, getLast7Days());
    refreshHistory();
  } catch (err) {
    console.error('Render failed:', err);
    scheduleEl.removeAttribute('aria-busy');
    scheduleEl.removeAttribute('aria-label');
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
  const addBtn = e.target.closest('.empty-schedule-add-btn');
  if (addBtn) {
    if (!scheduleEditMode) toggleScheduleEditMode();
    return;
  }
  const editSaveBtn = e.target.closest('.row-edit-save-btn');
  if (editSaveBtn) {
    saveEditRow(Number(editSaveBtn.dataset.index));
    return;
  }
  const editCancelBtn = e.target.closest('.row-edit-cancel-btn');
  if (editCancelBtn) {
    cancelEditRow();
    return;
  }
  const editBtn = e.target.closest('.row-edit-btn');
  if (editBtn) {
    startEditRow(Number(editBtn.dataset.index));
    return;
  }
  const deleteBtn = e.target.closest('.row-delete-btn');
  if (deleteBtn) {
    deleteRow(Number(deleteBtn.dataset.index));
    return;
  }
  const rowEl = e.target.closest('.row[data-index]');
  if (!rowEl) return;
  openRow(Number(rowEl.dataset.index));
});

// Rows are role="button"/tabindex divs (can't be real <button>s - they
// sometimes contain a nested delete button in schedule-edit mode), so
// Enter/Space needs to be wired manually. The delete button itself is
// already a real button and gets native keyboard support for free.
scheduleEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const editForm = e.target.closest('.row-edit-form');
  if (editForm) {
    // Space should type a space in the text inputs, not submit - only Enter does.
    if (e.key !== 'Enter') return;
    e.preventDefault();
    saveEditRow(Number(editForm.dataset.index));
    return;
  }
  if (e.target.closest('.row-delete-btn')) return;
  const rowEl = e.target.closest('.row[data-index]');
  if (!rowEl) return;
  e.preventDefault();
  openRow(Number(rowEl.dataset.index));
});

sheetEls.backdrop.addEventListener('click', closeSheet);
sheetCloseBtn.addEventListener('click', closeSheet);
sheetEditBtn.addEventListener('click', toggleEditMode);
exportBtn.addEventListener('click', () => shareModeLog(getAllModeLogEntries(), toastEls));
scheduleEditBtn.addEventListener('click', toggleScheduleEditMode);

newTemplateBtn.addEventListener('click', openTemplateBuilder);
document.getElementById('builder-cancel-name').addEventListener('click', requestCloseTemplateBuilder);
document.getElementById('builder-cancel-anchors').addEventListener('click', requestCloseTemplateBuilder);
document.getElementById('builder-name-next').addEventListener('click', goToAnchorStep);
document.getElementById('builder-anchor-add-btn').addEventListener('click', addBuilderAnchor);
builderSaveBtn.addEventListener('click', saveNewTemplate);
builderNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    goToAnchorStep();
  }
});
[builderAnchorTimeInput, builderAnchorLabelInput].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBuilderAnchor();
    }
  });
});

async function completeOnboarding(id) {
  setSelectedTemplateId(id);
  currentTemplateId = id;
  onboardingEl.style.display = 'none';
  releaseFocus();
  updateView();
  await render();
}

async function init() {
  cleanupOldDailyKeys();

  try {
    [staticTemplateIndex, modeNotes] = await Promise.all([
      fetch('src/templates/index.json').then((res) => res.json()),
      fetch('src/config/mode-notes.json').then((res) => res.json()),
    ]);
  } catch (err) {
    console.error('Startup failed:', err);
    scheduleEl.removeAttribute('aria-busy');
    scheduleEl.removeAttribute('aria-label');
    scheduleEl.innerHTML = '<div class="render-error">Could not load the app. Check your connection and reload.</div>';
    return;
  }
  buildMergedTemplateIndex();

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
    currentTemplateId = staticTemplateIndex[0].id;
    setSelectedTemplateId(currentTemplateId);
    updateView();
    await render();
  } else {
    renderOnboarding(onboardingOptionsEl, templateIndex, completeOnboarding);
    onboardingEl.style.display = 'flex';
    trapFocus(onboardingEl);
  }
}

init();
