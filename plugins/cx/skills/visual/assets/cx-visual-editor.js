(function () {
  "use strict";

  var SCHEMA_ID = "cx-visual-schema";
  var STATE_ID = "cx-visual-saved-state";
  var SHELL_ATTR = "data-cx-editor-shell";
  var ASSET_ATTR = "data-cx-editor-asset";
  var SELECTED_CLASS = "cx-editor-selected-outline";
  var EDIT_CLASS = "cx-edit-mode";
  var STORAGE_PREFIX = "cx-visual:";
  var fileHandle = null;
  var finalDirectoryHandle = null;
  var schema = readJson(SCHEMA_ID, {});
  var savedState = normalizeState(readJson(STATE_ID, {}));
  var draftKey = STORAGE_PREFIX + (schema.changeId || savedState.changeId || "prototype") + ":draft";
  var draftState = readStorage(draftKey);
  var activeState = normalizeState(mergeState(savedState, draftState || {}));
  var selectedId = null;
  var panelOpen = false;
  var editMode = new URLSearchParams(window.location.search).get("edit") === "1";

  function readJson(id, fallback) {
    var node = document.getElementById(id);
    if (!node) return fallback;
    try {
      return JSON.parse(node.textContent || "{}");
    } catch (error) {
      console.warn("CX Visual: invalid JSON in #" + id, error);
      return fallback;
    }
  }

  function writeJson(id, value) {
    var node = document.getElementById(id);
    if (!node) {
      node = document.createElement("script");
      node.id = id;
      node.type = "application/json";
      document.body.appendChild(node);
    }
    node.textContent = JSON.stringify(value, null, 2);
  }

  function readStorage(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }

  function clearStorage(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {}
  }

  function normalizeState(value) {
    var state = value && typeof value === "object" ? value : {};
    return {
      changeId: state.changeId || schema.changeId || "",
      tweaks: state.tweaks || {},
      content: state.content || {},
      tokens: state.tokens || {},
      layout: state.layout || {},
      components: state.components || {},
      interactions: state.interactions || {},
      prototypeState: state.prototypeState || {},
      updatedAt: state.updatedAt || new Date().toISOString()
    };
  }

  function mergeState(base, patch) {
    var next = Object.assign({}, base || {});
    ["tweaks", "content", "tokens", "layout", "components", "interactions", "prototypeState"].forEach(function (key) {
      next[key] = Object.assign({}, (base && base[key]) || {}, (patch && patch[key]) || {});
    });
    if (patch && patch.changeId) next.changeId = patch.changeId;
    if (patch && patch.updatedAt) next.updatedAt = patch.updatedAt;
    return next;
  }

  function getPrototype() {
    return window.CXPrototype && typeof window.CXPrototype === "object" ? window.CXPrototype : null;
  }

  function getSchema() {
    var proto = getPrototype();
    if (proto && typeof proto.getEditableSchema === "function") {
      try {
        return Object.assign({}, schema, proto.getEditableSchema());
      } catch (error) {
        console.warn("CX Visual: getEditableSchema failed", error);
      }
    }
    return schema;
  }

  function getTokenDefs() {
    return getSchema().tokens || {};
  }

  function getStateDefs() {
    return getSchema().states || {};
  }

  function getContentDefs() {
    return getSchema().content || {};
  }

  function findEditable(id) {
    if (!id) return null;
    return document.querySelector('[data-edit-id="' + cssEscape(id) + '"]');
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/"/g, '\\"');
  }

  function getEditableNodes() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-edit-id]"));
  }

  function collectContent() {
    var content = {};
    getEditableNodes().forEach(function (node) {
      var id = node.getAttribute("data-edit-id");
      var type = node.getAttribute("data-editable") || node.getAttribute("data-edit-type");
      if (id && (type === "text" || getContentDefs()[id])) {
        content[id] = node.textContent;
      }
    });
    return content;
  }

  function collectTokens() {
    var tokens = {};
    var defs = getTokenDefs();
    Object.keys(defs).forEach(function (key) {
      var cssVar = defs[key].cssVar;
      if (!cssVar) return;
      var value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
      if (value) tokens[key] = value;
    });
    return tokens;
  }

  function collectPrototypeState() {
    var proto = getPrototype();
    if (proto && typeof proto.getState === "function") {
      try {
        return proto.getState() || {};
      } catch (error) {
        console.warn("CX Visual: getState failed", error);
      }
    }
    return activeState.prototypeState || {};
  }

  function getState() {
    activeState = normalizeState(mergeState(activeState, {
      content: collectContent(),
      tokens: Object.assign({}, activeState.tokens, collectTokens()),
      prototypeState: collectPrototypeState(),
      updatedAt: new Date().toISOString()
    }));
    return activeState;
  }

  function applyContent(content) {
    Object.keys(content || {}).forEach(function (id) {
      var node = findEditable(id);
      if (node) node.textContent = content[id];
    });
  }

  function applyTokens(tokens) {
    var defs = getTokenDefs();
    Object.keys(tokens || {}).forEach(function (key) {
      var def = defs[key];
      if (!def || !def.cssVar) return;
      document.documentElement.style.setProperty(def.cssVar, String(tokens[key]));
    });
  }

  function applyPrototypeState(prototypeState) {
    var proto = getPrototype();
    if (proto && typeof proto.setState === "function") {
      try {
        proto.setState(prototypeState || {});
      } catch (error) {
        console.warn("CX Visual: setState failed", error);
      }
    }
  }

  function setState(patch) {
    activeState = normalizeState(mergeState(activeState, patch || {}));
    applyContent(activeState.content);
    applyTokens(activeState.tokens);
    applyPrototypeState(activeState.prototypeState);
    writeStorage(draftKey, activeState);
    renderPanel();
  }

  function enableTextEditing() {
    getEditableNodes().forEach(function (node) {
      var type = node.getAttribute("data-editable") || node.getAttribute("data-edit-type");
      if (type === "text" || getContentDefs()[node.getAttribute("data-edit-id")]) {
        node.contentEditable = editMode ? "true" : "false";
        node.spellcheck = false;
      }
    });
  }

  function bindPrototypeEvents() {
    document.addEventListener("click", function (event) {
      if (!editMode) return;
      if (event.target.closest("[" + SHELL_ATTR + "]")) return;
      var node = event.target.closest("[data-edit-id]");
      if (!node) return;
      selectNode(node.getAttribute("data-edit-id"));
    }, true);

    document.addEventListener("input", function (event) {
      var node = event.target.closest("[data-edit-id]");
      if (!node) return;
      var id = node.getAttribute("data-edit-id");
      activeState.content[id] = node.textContent;
      activeState.updatedAt = new Date().toISOString();
      writeStorage(draftKey, activeState);
    });
  }

  function selectNode(id) {
    selectedId = id;
    document.querySelectorAll("." + SELECTED_CLASS).forEach(function (node) {
      node.classList.remove(SELECTED_CLASS);
    });
    var node = findEditable(id);
    if (node) node.classList.add(SELECTED_CLASS);
    renderPanel();
  }

  function setEditMode(value) {
    editMode = Boolean(value);
    document.documentElement.classList.toggle(EDIT_CLASS, editMode);
    enableTextEditing();
    renderPanel();
  }

  function makeButton(label, onClick, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className || "cx-editor-button";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function makeField(key, def, value, onChange) {
    var wrap = document.createElement("div");
    wrap.className = "cx-editor-field";
    var label = document.createElement("label");
    label.textContent = def.label || key;
    wrap.appendChild(label);

    var input;
    if (def.type === "select") {
      input = document.createElement("select");
      (def.options || []).forEach(function (optionValue) {
        var option = document.createElement("option");
        option.value = typeof optionValue === "object" ? optionValue.value : optionValue;
        option.textContent = typeof optionValue === "object" ? optionValue.label : optionValue;
        input.appendChild(option);
      });
    } else if (def.type === "toggle" || def.type === "checkbox") {
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(value);
    } else {
      input = document.createElement("input");
      input.type = def.type === "color" ? "color" : def.type === "range" ? "range" : "text";
      if (def.min !== undefined) input.min = def.min;
      if (def.max !== undefined) input.max = def.max;
      if (def.step !== undefined) input.step = def.step;
    }

    if (input.type !== "checkbox") input.value = value == null ? def.default || "" : value;
    input.addEventListener("input", function () {
      var next = input.type === "checkbox" ? input.checked : input.value;
      if (def.type === "range" && def.unit) next = String(next) + def.unit;
      onChange(next);
    });
    input.addEventListener("change", function () {
      var next = input.type === "checkbox" ? input.checked : input.value;
      if (def.type === "range" && def.unit) next = String(next) + def.unit;
      onChange(next);
    });

    wrap.appendChild(input);
    return wrap;
  }

  function renderPanel() {
    var shell = document.querySelector("[" + SHELL_ATTR + "]");
    if (!shell) return;
    shell.innerHTML = "";

    var toggle = makeButton(panelOpen ? "Close editor" : "Edit prototype", function () {
      panelOpen = !panelOpen;
      renderPanel();
    }, "cx-editor-toggle");
    shell.appendChild(toggle);

    var panel = document.createElement("div");
    panel.className = panelOpen ? "cx-editor-panel" : "cx-editor-panel cx-editor-hidden";
    shell.appendChild(panel);

    var header = document.createElement("div");
    header.className = "cx-editor-header";
    header.innerHTML = '<div><div class="cx-editor-title">CX Visual Editor</div><div class="cx-editor-subtitle">' +
      escapeHtml(schema.changeId || activeState.changeId || "prototype") + '</div></div>';
    header.appendChild(makeButton(editMode ? "Done" : "Edit", function () {
      setEditMode(!editMode);
    }, "cx-editor-icon-button"));
    panel.appendChild(header);

    var actions = document.createElement("div");
    actions.className = "cx-editor-actions";
    actions.appendChild(makeButton("Save editable", saveEditable, "cx-editor-button primary"));
    actions.appendChild(makeButton("Export final", saveFinal, "cx-editor-button"));
    actions.appendChild(makeButton("Reset draft", reset, "cx-editor-button"));
    actions.appendChild(makeButton("Refresh", function () { setState(getState()); }, "cx-editor-button"));
    panel.appendChild(actions);

    var exportHint = document.createElement("div");
    exportHint.className = "cx-editor-help";
    exportHint.textContent = "Export final must be saved in the directory that contains prototype.editable.html.";
    panel.appendChild(exportHint);

    var selected = document.createElement("div");
    selected.className = "cx-editor-section";
    selected.innerHTML = '<div class="cx-editor-section-title">Selected</div><div class="cx-editor-selected">' +
      escapeHtml(selectedId || "None") + '</div>';
    panel.appendChild(selected);

    renderTokenFields(panel);
    renderStateFields(panel);
  }

  function renderTokenFields(panel) {
    var defs = getTokenDefs();
    var keys = Object.keys(defs);
    if (!keys.length) return;
    var section = document.createElement("div");
    section.className = "cx-editor-section";
    section.innerHTML = '<div class="cx-editor-section-title">Tokens</div>';
    keys.forEach(function (key) {
      var def = defs[key];
      var current = activeState.tokens[key] || (def.cssVar ? getComputedStyle(document.documentElement).getPropertyValue(def.cssVar).trim() : def.default);
      section.appendChild(makeField(key, def, normalizeFieldValue(current, def), function (value) {
        var next = {};
        next[key] = value;
        setState({ tokens: next });
      }));
    });
    panel.appendChild(section);
  }

  function renderStateFields(panel) {
    var defs = getStateDefs();
    var keys = Object.keys(defs);
    if (!keys.length) return;
    var section = document.createElement("div");
    section.className = "cx-editor-section";
    section.innerHTML = '<div class="cx-editor-section-title">Prototype state</div>';
    keys.forEach(function (key) {
      var def = defs[key];
      var current = activeState.prototypeState[key] == null ? def.default : activeState.prototypeState[key];
      section.appendChild(makeField(key, def, current, function (value) {
        var next = {};
        next[key] = value;
        setState({ prototypeState: next });
      }));
    });
    panel.appendChild(section);
  }

  function normalizeFieldValue(value, def) {
    if (def && def.type === "range" && def.unit && typeof value === "string") {
      return value.replace(def.unit, "");
    }
    return value;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function stripEditorArtifacts(root) {
    root.querySelectorAll("[" + SHELL_ATTR + "], [" + ASSET_ATTR + "], #cx-visual-schema, #cx-visual-saved-state").forEach(function (node) {
      node.remove();
    });
    root.querySelectorAll("." + SELECTED_CLASS).forEach(function (node) {
      node.classList.remove(SELECTED_CLASS);
    });
    root.classList.remove(EDIT_CLASS);
    root.querySelectorAll("[contenteditable]").forEach(function (node) {
      node.removeAttribute("contenteditable");
      node.removeAttribute("spellcheck");
    });
  }

  function stripEditableMarkers(root) {
    root.querySelectorAll("[data-edit-id], [data-editable], [data-edit-type], [data-editor-only]").forEach(function (node) {
      node.removeAttribute("data-edit-id");
      node.removeAttribute("data-editable");
      node.removeAttribute("data-edit-type");
      if (node.hasAttribute("data-editor-only")) node.remove();
    });
  }

  function applyExportRemoveSelectors(root) {
    var removeSelectors = (getSchema().export && getSchema().export.removeSelectors) || [];
    removeSelectors.forEach(function (selector) {
      try {
        root.querySelectorAll(selector).forEach(function (node) { node.remove(); });
      } catch (error) {}
    });
  }

  function exportEditableHTML() {
    var state = getState();
    writeJson(STATE_ID, state);
    var clone = document.documentElement.cloneNode(true);
    stripTransientShell(clone);
    var stateNode = clone.querySelector("#" + STATE_ID);
    if (stateNode) stateNode.textContent = JSON.stringify(state, null, 2);
    return "<!doctype html>\n" + clone.outerHTML + "\n";
  }

  function stripTransientShell(root) {
    root.querySelectorAll("[" + SHELL_ATTR + "]").forEach(function (node) { node.remove(); });
    root.querySelectorAll("." + SELECTED_CLASS).forEach(function (node) { node.classList.remove(SELECTED_CLASS); });
    root.classList.remove(EDIT_CLASS);
    root.querySelectorAll("[contenteditable]").forEach(function (node) {
      node.removeAttribute("contenteditable");
      node.removeAttribute("spellcheck");
    });
  }

  function exportFinalHTML() {
    getState();
    var clone = document.documentElement.cloneNode(true);
    stripEditorArtifacts(clone);
    applyExportRemoveSelectors(clone);
    stripEditableMarkers(clone);
    return "<!doctype html>\n" + clone.outerHTML + "\n";
  }

  async function saveEditable() {
    var html = exportEditableHTML();
    if (window.showSaveFilePicker) {
      try {
        fileHandle = fileHandle || await window.showSaveFilePicker({
          suggestedName: "prototype.editable.html",
          types: [{ description: "HTML", accept: { "text/html": [".html"] } }]
        });
        var writable = await fileHandle.createWritable();
        await writable.write(html);
        await writable.close();
        clearStorage(draftKey);
        toast("Editable saved");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
        console.warn("CX Visual: file save failed, falling back to download", error);
      }
    }
    download("prototype.editable.html", html);
    toast("Downloaded editable file");
  }

  async function saveFinal() {
    var html = exportFinalHTML();
    var filename = "prototype.final.html";

    if (window.showDirectoryPicker) {
      try {
        finalDirectoryHandle = finalDirectoryHandle || await window.showDirectoryPicker({ mode: "readwrite" });
        await finalDirectoryHandle.getFileHandle("prototype.editable.html");
        var finalHandle = await finalDirectoryHandle.getFileHandle(filename, { create: true });
        var writable = await finalHandle.createWritable();
        await writable.write(html);
        await writable.close();
        toast("Final saved in selected visual directory");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
        if (error && error.name === "NotFoundError") {
          finalDirectoryHandle = null;
          toast("Choose the visual directory containing prototype.editable.html");
          return;
        }
        console.warn("CX Visual: directory save failed, falling back to file picker", error);
      }
    }

    if (window.showSaveFilePicker) {
      try {
        var handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "HTML", accept: { "text/html": [".html"] } }]
        });
        var fileWritable = await handle.createWritable();
        await fileWritable.write(html);
        await fileWritable.close();
        toast("Final saved");
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
        console.warn("CX Visual: final file save failed, falling back to download", error);
      }
    }

    download(filename, html);
    toast("Downloaded final file; place it in this visual directory");
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function reset() {
    clearStorage(draftKey);
    activeState = normalizeState(savedState);
    setState(activeState);
    toast("Draft reset");
  }

  function importState(nextState) {
    setState(nextState || {});
  }

  function toast(message) {
    var node = document.createElement("div");
    node.className = "cx-editor-toast";
    node.textContent = message;
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 1800);
  }

  function ensureShell() {
    if (document.querySelector("[" + SHELL_ATTR + "]")) return;
    var shell = document.createElement("div");
    shell.setAttribute(SHELL_ATTR, "");
    document.body.appendChild(shell);
  }

  function init() {
    applyContent(activeState.content);
    applyTokens(activeState.tokens);
    applyPrototypeState(activeState.prototypeState);
    ensureShell();
    bindPrototypeEvents();
    setEditMode(editMode);
    renderPanel();
  }

  window.CXVisual = {
    getState: getState,
    setState: setState,
    saveEditable: saveEditable,
    exportEditableHTML: exportEditableHTML,
    exportFinalHTML: exportFinalHTML,
    saveFinal: saveFinal,
    reset: reset,
    importState: importState
  };

  window.CXVisualEditor = {
    init: init,
    getSchema: getSchema
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
