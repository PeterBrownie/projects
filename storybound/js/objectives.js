// js/objectives.js — requires: js/api-functions.js, js/render.js, js/scene.js (updateTopPanelsLayout)
// Runtime globals from game.js: environmentData, actionHistory, generatedCharacter, currentObjectives, saveFullProgress

// ---------------------------------------------------------------------------
// Module globals
// ---------------------------------------------------------------------------

var isObjectivesExpanded = false;
var showCompletedObjectives = false;
var collapsedObjectiveKeys = new Set();

// ---------------------------------------------------------------------------
// difficultyToColor
// ---------------------------------------------------------------------------

function difficultyToColor(difficulty) {
    var d = normalizeObjectiveDifficulty(difficulty);
    if (d === null) return "#b0b3b8";
    var normalized = (d - 1) / 9; // 0..1
    var opinionScale = 1 - (normalized * 2); // easy=>1 (green), hard=>-1 (red)
    if (typeof opinionToColor === "function") {
        return opinionToColor(opinionScale);
    }
    var r, g, b;
    if (opinionScale <= 0) {
        var t = opinionScale + 1;
        r = 255;
        g = Math.round(77 + (224 - 77) * t);
        b = Math.round(77 + (130 - 77) * t);
        return "rgb(" + r + "," + g + "," + b + ")";
    }
    var t2 = opinionScale;
    r = Math.round(255 + (76 - 255) * t2);
    g = Math.round(224 + (175 - 224) * t2);
    b = Math.round(130 + (80 - 130) * t2);
    return "rgb(" + r + "," + g + "," + b + ")";
}

// ---------------------------------------------------------------------------
// sanitizeObjectiveList
// ---------------------------------------------------------------------------

function sanitizeObjectiveList(objectives, includeHidden) {
    if (includeHidden === undefined) includeHidden = false;
    if (!Array.isArray(objectives)) return [];
    return objectives
        .filter(function(obj) { return obj && typeof obj === "object"; })
        .map(function(obj) {
            var title = String(obj.title || "").trim();
            if (!title) return null;
            var cleanObj = {
                id: String(obj.id || "").trim(),
                title: title,
                description: String(obj.description || "").trim(),
                is_completed: !!obj.is_completed,
                steps: Array.isArray(obj.steps) ? obj.steps
                    .filter(function(step) { return step && typeof step === "object"; })
                    .map(function(step) {
                        var stepType = normalizeObjectiveStepType(step.step_type);
                        var status = normalizeObjectiveStepStatus(step.status, stepType, !!step.is_completed);
                        var cleanStep = {
                            user_text: String(step.user_text || step.description || "").trim(),
                            step_type: stepType,
                            status: status,
                            is_completed: status === "completed"
                        };
                        if (includeHidden) {
                            cleanStep.hidden_context = String(step.hidden_context || "").trim();
                        }
                        return cleanStep;
                    })
                    .filter(function(step) { return step.user_text; }) : []
            };
            var difficulty = normalizeObjectiveDifficulty(obj.difficulty);
            if (difficulty !== null) {
                cleanObj.difficulty = difficulty;
            }
            return cleanObj;
        })
        .filter(Boolean);
}

// ---------------------------------------------------------------------------
// getObjectiveUiKey
// ---------------------------------------------------------------------------

function getObjectiveUiKey(obj, fallbackIndex) {
    if (fallbackIndex === undefined) fallbackIndex = 0;
    if (!obj || typeof obj !== "object") return "objective_" + fallbackIndex;
    var id = String(obj.id || "").trim();
    if (id) return "id:" + id;
    var title = String(obj.title || "").trim().toLowerCase();
    var description = String(obj.description || "").trim().toLowerCase();
    if (title || description) return "td:" + title + "::" + description;
    return "objective_" + fallbackIndex;
}

// ---------------------------------------------------------------------------
// Panel toggle + layout
// ---------------------------------------------------------------------------

function setObjectivesExpanded(expanded) {
    var objectivesPanel = document.getElementById('objectivesPanel');
    var objectivesToggleBtn = document.getElementById('objectivesToggleBtn');
    if (!objectivesPanel || !objectivesToggleBtn) return;
    isObjectivesExpanded = !!expanded;
    objectivesPanel.style.display = isObjectivesExpanded ? "block" : "none";
    objectivesPanel.setAttribute("aria-hidden", isObjectivesExpanded ? "false" : "true");
    objectivesToggleBtn.setAttribute("aria-expanded", isObjectivesExpanded ? "true" : "false");
    var activeCount = sanitizeObjectiveList(generatedCharacter && generatedCharacter.objectives)
        .filter(function(obj) { return !obj.is_completed; }).length;
    objectivesToggleBtn.textContent = isObjectivesExpanded
        ? "Hide Objectives (" + activeCount + ")"
        : "View Objectives (" + activeCount + ")";
    objectivesToggleBtn.title = isObjectivesExpanded ? "Hide objectives" : "Show objectives";
    updateTopPanelsLayout();
}

// ---------------------------------------------------------------------------
// renderObjectivesPanel
// ---------------------------------------------------------------------------

function renderObjectivesPanel() {
    var objectivesList = document.getElementById('objectivesList');
    if (!objectivesList) return;
    var objectives = sanitizeObjectiveList(generatedCharacter && generatedCharacter.objectives)
        .map(function(obj, idx) {
            return Object.assign({}, obj, { _index: idx, _uiKey: getObjectiveUiKey(obj, idx) });
        });
    if (!Array.isArray(objectives) || objectives.length === 0) {
        objectivesList.innerHTML = '<div class="action-history-text" style="opacity:0.68;">No objectives yet.</div>';
        return;
    }
    var hasCompletedObjectives = objectives.some(function(obj) { return obj.is_completed; });
    if (!hasCompletedObjectives && showCompletedObjectives) {
        showCompletedObjectives = false;
    }
    var visibleObjectives = showCompletedObjectives
        ? objectives
        : objectives.filter(function(obj) { return !obj.is_completed; });
    var controlsHtml = hasCompletedObjectives
        ? '<label class="objectives-filter-toggle">' +
            '<input id="showCompletedObjectivesCheckbox" type="checkbox" ' + (showCompletedObjectives ? "checked" : "") + '>' +
            '<span>show completed objectives</span>' +
          '</label>'
        : "";

    var listHtml = visibleObjectives.length > 0
        ? visibleObjectives.map(function(obj) {
            var steps = Array.isArray(obj.steps) ? obj.steps : [];
            var isCollapsed = collapsedObjectiveKeys.has(obj._uiKey);
            var stepsHtml = steps.length > 0
                ? '<ol class="objective-steps">' + steps.map(function(step) {
                    var statusLabel = step.status === "completed" ? "done" : (step.status === "passed" ? "passed" : "active");
                    var kindLabel = step.step_type;
                    var statusSuffix = step.status === "passed" ? ' <span class="objective-step-state">(Passed)</span>' : "";
                    return '<li class="objective-step ' + escapeHtml(step.step_type) + ' ' + escapeHtml(step.status) + '">' +
                        '<span class="objective-step-kind">' + escapeHtml(kindLabel) + '</span> ' +
                        '<span class="objective-step-text">' + escapeHtml(step.user_text) + statusSuffix + '</span>' +
                        '<span class="objective-step-status">' + escapeHtml(statusLabel) + '</span>' +
                        '</li>';
                }).join('') + '</ol>'
                : '<div class="objective-description" style="opacity:0.78;margin-top:0.24em;">No steps yet.</div>';
            var descriptionHtml = isCollapsed ? '' :
                '<div class="objective-description">' +
                escapeHtml(obj.description || '') +
                (obj.difficulty ? ' <span style="opacity:0.72;">(Difficulty ' + escapeHtml(String(obj.difficulty)) + '/10)</span>' : '') +
                '</div>' + stepsHtml;
            return '<div class="objective-entry">' +
                '<div class="objective-title-row">' +
                    '<button type="button" class="objective-title objective-toggle-btn"' +
                        ' data-objective-key="' + escapeAttribute(obj._uiKey) + '"' +
                        ' aria-expanded="' + (isCollapsed ? "false" : "true") + '"' +
                        ' title="' + (isCollapsed ? "Expand objective" : "Collapse objective") + '">' +
                        '<span class="objective-toggle-caret">' + (isCollapsed ? "▸" : "▾") + '</span>' +
                        escapeHtml(obj.title) + (obj.is_completed ? ' (Completed)' : '') +
                    '</button>' +
                    '<button type="button" class="objective-cancel-btn" data-objective-index="' + obj._index + '" title="Cancel objective">cancel</button>' +
                '</div>' +
                descriptionHtml +
            '</div>';
        }).join("")
        : '<div class="action-history-text" style="opacity:0.68;">No active objectives.</div>';

    objectivesList.innerHTML = controlsHtml + listHtml;

    var checkbox = document.getElementById("showCompletedObjectivesCheckbox");
    if (checkbox) {
        checkbox.onchange = function() {
            showCompletedObjectives = !!this.checked;
            renderObjectivesPanel();
        };
    }

    objectivesList.querySelectorAll('.objective-cancel-btn').forEach(function(btn) {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', async function() {
            if (!generatedCharacter || !Array.isArray(generatedCharacter.objectives)) return;
            var idx = Number(btn.getAttribute('data-objective-index'));
            if (!Number.isInteger(idx) || idx < 0 || idx >= generatedCharacter.objectives.length) return;
            generatedCharacter.objectives.splice(idx, 1);
            syncObjectivesUI();
            try {
                await saveFullProgress(generatedCharacter, environmentData, actionHistory);
            } catch (err) {
                console.error('[objective_cancel] Failed to save objective removal:', err);
            }
        });
    });

    objectivesList.querySelectorAll('.objective-toggle-btn').forEach(function(btn) {
        if (btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';
        btn.addEventListener('click', function() {
            var key = String(btn.getAttribute('data-objective-key') || '').trim();
            if (!key) return;
            if (collapsedObjectiveKeys.has(key)) {
                collapsedObjectiveKeys.delete(key);
            } else {
                collapsedObjectiveKeys.add(key);
            }
            renderObjectivesPanel();
        });
    });
}

// ---------------------------------------------------------------------------
// syncObjectivesUI
// ---------------------------------------------------------------------------

function syncObjectivesUI() {
    renderObjectivesPanel();
    setObjectivesExpanded(isObjectivesExpanded);
}
