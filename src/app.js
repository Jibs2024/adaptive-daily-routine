import { renderModeToggle } from './components/modeToggle.js';
import { renderTemplatePicker } from './components/templatePicker.js';
import { renderSchedule } from './components/scheduleRow.js';

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

let templateIndex = [];
let modeNotes = {};
const templateCache = new Map();

let currentTemplateId = null;
let currentMode = 'full';

async function loadTemplate(id) {
  if (templateCache.has(id)) return templateCache.get(id);
  const entry = templateIndex.find((t) => t.id === id);
  const data = await fetch(`src/templates/${entry.file}`).then((res) => res.json());
  templateCache.set(id, data);
  return data;
}

async function render() {
  const template = await loadTemplate(currentTemplateId);

  renderTemplatePicker(templatePickerEl, templateIndex, currentTemplateId, selectTemplate);
  renderModeToggle(modeToggleEl, currentMode, selectMode);

  subtitleEl.textContent = template.subtitle;
  modeNoteEl.textContent = modeNotes[currentMode];
  renderSchedule(scheduleEl, template.schedule[currentMode], currentMode);
}

async function selectTemplate(id) {
  currentTemplateId = id;
  await render();
}

async function selectMode(mode) {
  currentMode = mode;
  await render();
}

async function init() {
  [templateIndex, modeNotes] = await Promise.all([
    fetch('src/templates/index.json').then((res) => res.json()),
    fetch('src/config/mode-notes.json').then((res) => res.json()),
  ]);
  currentTemplateId = templateIndex[0].id;
  await render();
}

init();
