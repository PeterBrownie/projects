// js/scene.js — requires: js/api-functions.js, js/render.js

// ---------------------------------------------------------------------------
// IMAGE GENERATION GATE
//
// Image generation is disabled by default. This is intentional.
//
// This app supports mature content via user settings. Most image generation
// providers enforce content policies that may flag or suspend API keys used
// to generate mature imagery. To protect users from accidental policy
// violations, image generation is hidden unless explicitly enabled.
//
// To enable it: set ENABLE_IMAGE_GEN to true below, or use the demo passkey
// unlock in the settings modal (passkey unlock is session-only, no persist).
// ---------------------------------------------------------------------------
var ENABLE_IMAGE_GEN = false;

// In-memory scene image store — Map keyed by image id (not persisted to localStorage)
var _sceneImages = new Map();

function getSceneImage(id) { return _sceneImages.get(id) || null; }
function storeSceneImage(img) { if (img && img.id) _sceneImages.set(img.id, img); }
function removeSceneImage(id) { _sceneImages.delete(id); }
function getAllSceneImages() { return Array.from(_sceneImages.values()); }

// Module-level state
var isSceneViewExpanded = false;
var isGeneratingSceneImage = false;
var isLoadingSceneFocusOptions = false;
var currentSceneImages = [];
var pendingSceneFocusOptions = [];
var manualSceneFocusText = "";

// ---------------------------------------------------------------------------
// Image gen gate — called on page load and after passkey unlock
// ---------------------------------------------------------------------------

function syncImageGenGate() {
    var sceneHeader = document.getElementById('sceneViewHeader');
    if (sceneHeader) sceneHeader.style.display = ENABLE_IMAGE_GEN ? '' : 'none';
    var imageModelField = document.getElementById('settingsImageModelField');
    if (imageModelField) imageModelField.style.display = ENABLE_IMAGE_GEN ? '' : 'none';
}

function enableImageGen() {
    ENABLE_IMAGE_GEN = true;
    syncImageGenGate();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeSceneImageList(images) {
    if (!Array.isArray(images)) return [];
    return images
        .filter(function(img) { return img && typeof img === "object"; })
        .map(function(img) {
            return {
                id: String(img.id || "").trim(),
                url: String(img.url || "").trim(),
                filename: String(img.filename || "").trim(),
                created_at: String(img.created_at || "").trim(),
                visual_description: String(img.visual_description || "").trim(),
                image_model: String(img.image_model || "").trim()
            };
        })
        .filter(function(img) { return img.url; });
}

// ---------------------------------------------------------------------------
// Panel layout
// ---------------------------------------------------------------------------

function updateTopPanelsLayout() {
    var topPanelsRow = document.getElementById('topPanelsRow');
    if (!topPanelsRow) return;
    var isSceneOnlyExpanded = isSceneViewExpanded && !isObjectivesExpanded;
    topPanelsRow.classList.toggle('scene-only-expanded', isSceneOnlyExpanded);
}

// ---------------------------------------------------------------------------
// Panel toggle
// ---------------------------------------------------------------------------

function setSceneViewExpanded(expanded) {
    var sceneViewPanel = document.getElementById('sceneViewPanel');
    var sceneViewToggleBtn = document.getElementById('sceneViewToggleBtn');
    if (!sceneViewPanel || !sceneViewToggleBtn) return;
    isSceneViewExpanded = !!expanded;
    sceneViewPanel.style.display = isSceneViewExpanded ? "block" : "none";
    sceneViewPanel.setAttribute("aria-hidden", isSceneViewExpanded ? "false" : "true");
    sceneViewToggleBtn.setAttribute("aria-expanded", isSceneViewExpanded ? "true" : "false");
    var count = sanitizeSceneImageList(currentSceneImages).length;
    sceneViewToggleBtn.title = isSceneViewExpanded ? "Hide generated scene images" : "View generated scene images";
    sceneViewToggleBtn.innerHTML = '<span class="scene-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true"><path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zm-2 0H5l4.5-6 3.5 4.5 2.5-3L19 19zM8.5 11A2.5 2.5 0 1 0 8.5 6a2.5 2.5 0 0 0 0 5z"/></svg></span><span>' + (isSceneViewExpanded ? 'Hide Scene (' + count + ')' : 'View Scene (' + count + ')') + '</span>';
    if (isSceneViewExpanded) renderSceneViewPanel();
    updateTopPanelsLayout();
}

function syncSceneViewUI() {
    renderSceneViewPanel();
    setSceneViewExpanded(isSceneViewExpanded);
}

// ---------------------------------------------------------------------------
// Panel render
// ---------------------------------------------------------------------------

function renderSceneViewPanel() {
    var sceneViewList = document.getElementById('sceneViewList');
    if (!sceneViewList) return;
    var canGenerate = !!generatedCharacter && !!environmentData && !isGeneratingSceneImage && !isLoadingSceneFocusOptions;
    var canUseManualFocus = !!generatedCharacter && !!environmentData && !isGeneratingSceneImage && !isLoadingSceneFocusOptions;
    var images = sanitizeSceneImageList(currentSceneImages).slice().reverse();

    var controlsHtml = '<div class="scene-view-controls">' +
        '<button type="button" id="generateSceneImageBtn" class="scene-generate-btn" ' + (canGenerate ? "" : "disabled") + '>' +
            (isLoadingSceneFocusOptions ? "Loading focus options..." : isGeneratingSceneImage ? "Generating scene..." : "Generate New Scene") +
        '</button>' +
        '<span style="font-size:0.78em;color:#8ea4ba;opacity:0.85;">Images are saved per character and never sent into normal story prompts.</span>' +
        '</div>';

    var focusOptionsHtml = "";
    if (isGeneratingSceneImage && pendingSceneFocusOptions.length === 0) {
        focusOptionsHtml = '<div class="scene-generating-indicator">' +
            '<div class="scene-generating-spinner"></div>' +
            '<span>Generating scene image&hellip;</span>' +
            '</div>';
    } else if (pendingSceneFocusOptions.length > 0) {
        var focusBtns = pendingSceneFocusOptions.map(function(option, idx) {
            return '<button type="button" class="scene-focus-btn" data-focus-index="' + idx + '">' + escapeHtml(option) + '</button>';
        }).join("");
        focusOptionsHtml = '<div class="scene-focus-options">' +
            '<div class="scene-focus-title">Choose what you want to look at:</div>' +
            '<div class="scene-focus-grid">' + focusBtns + '</div>' +
            '<div class="scene-focus-manual">' +
                '<input' +
                    ' type="text"' +
                    ' id="sceneManualFocusInput"' +
                    ' class="scene-focus-manual-input"' +
                    ' value="' + escapeAttribute(manualSceneFocusText) + '"' +
                    ' placeholder="Or type your own focus..."' +
                    ' maxlength="180"' +
                    (canUseManualFocus ? "" : " disabled") + '>' +
                '<button' +
                    ' type="button"' +
                    ' id="sceneManualFocusBtn"' +
                    ' class="scene-focus-manual-btn"' +
                    (canUseManualFocus ? "" : " disabled") + '>' +
                    'Generate' +
                '</button>' +
            '</div>' +
        '</div>';
    }

    var galleryHtml;
    if (images.length > 0) {
        var thumbs = images.map(function(img, idx) {
            var stamp = img.created_at ? new Date(img.created_at).toLocaleString() : "";
            var title = stamp ? "Generated " + stamp : "Generated scene";
            var imageId = escapeAttribute(img.id || "");
            var filename = escapeAttribute(img.filename || "");
            return '<div class="scene-thumb-wrap">' +
                '<a href="' + escapeAttribute(img.url) + '" target="_blank" rel="noopener noreferrer" class="scene-thumb-btn" title="' + escapeAttribute(title) + '">' +
                    '<img class="scene-thumb-image" src="' + escapeAttribute(img.url) + '" alt="Generated scene ' + (idx + 1) + '">' +
                    '<div class="scene-thumb-meta">' + escapeHtml(stamp || img.filename || ("Scene " + (idx + 1))) + '</div>' +
                '</a>' +
                '<button' +
                    ' type="button"' +
                    ' class="scene-delete-btn"' +
                    ' data-image-id="' + imageId + '"' +
                    ' data-filename="' + filename + '"' +
                    ' title="Delete this image"' +
                    ' aria-label="Delete scene image ' + (idx + 1) + '">' +
                    '<svg viewBox="0 0 24 24" width="13" height="13" focusable="false" aria-hidden="true">' +
                        '<path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v8h-2V9zm4 0h2v8h-2V9zM7 9h2v8H7V9zm1 12h8a2 2 0 0 0 2-2V9H6v10a2 2 0 0 0 2 2z"/>' +
                    '</svg>' +
                '</button>' +
            '</div>';
        }).join("");
        galleryHtml = '<div class="scene-gallery-grid">' + thumbs + '</div>';
    } else {
        galleryHtml = '<div class="action-history-text" style="opacity:0.68;">No generated scene images yet.</div>';
    }

    sceneViewList.innerHTML = controlsHtml + focusOptionsHtml + galleryHtml;

    var generateBtn = document.getElementById("generateSceneImageBtn");
    if (generateBtn && !generateBtn.dataset.bound) {
        generateBtn.dataset.bound = "1";
        generateBtn.addEventListener("click", handleGenerateSceneImage);
    }

    sceneViewList.querySelectorAll(".scene-focus-btn").forEach(function(btn) {
        if (btn.dataset.bound === "1") return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", async function() {
            var idx = Number(btn.getAttribute("data-focus-index"));
            var option = Number.isInteger(idx) ? String(pendingSceneFocusOptions[idx] || "").trim() : "";
            if (!option) return;
            await generateSceneImageForFocus(option);
        });
    });

    var manualFocusInput = document.getElementById("sceneManualFocusInput");
    var manualFocusBtn = document.getElementById("sceneManualFocusBtn");
    if (manualFocusInput && manualFocusBtn && manualFocusInput.dataset.bound !== "1") {
        var syncManualBtnState = function() {
            if (!canUseManualFocus) {
                manualFocusBtn.disabled = true;
                return;
            }
            var hasText = String(manualFocusInput.value || "").trim().length > 0;
            manualFocusBtn.disabled = !hasText;
        };
        manualFocusInput.dataset.bound = "1";
        manualFocusInput.addEventListener("input", function() {
            manualSceneFocusText = String(manualFocusInput.value || "");
            syncManualBtnState();
        });
        manualFocusInput.addEventListener("keydown", async function(event) {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (manualFocusBtn.disabled) return;
            var inputValue = String(manualFocusInput.value || "").trim();
            if (!inputValue) return;
            var didGenerate = await generateSceneImageForFocus(inputValue);
            if (didGenerate) {
                manualSceneFocusText = "";
            }
        });
        manualFocusBtn.dataset.bound = "1";
        manualFocusBtn.addEventListener("click", async function() {
            var inputValue = String(manualFocusInput.value || "").trim();
            if (!inputValue || manualFocusBtn.disabled) return;
            var didGenerate = await generateSceneImageForFocus(inputValue);
            if (didGenerate) {
                manualSceneFocusText = "";
            }
        });
        syncManualBtnState();
    }

    sceneViewList.querySelectorAll(".scene-delete-btn").forEach(function(btn) {
        if (btn.dataset.bound === "1") return;
        btn.dataset.bound = "1";
        btn.addEventListener("click", async function(event) {
            event.preventDefault();
            event.stopPropagation();
            var imageId = String(btn.getAttribute("data-image-id") || "").trim();
            var filename = String(btn.getAttribute("data-filename") || "").trim();
            await deleteSceneImage(imageId, filename, btn);
        });
    });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

async function deleteSceneImage(imageId, filename, buttonEl) {
    if (!generatedCharacter) return;
    var characterName = String(generatedCharacter.name || "").trim();
    if (!characterName) return;
    if (!imageId && !filename) return;
    if (buttonEl) {
        buttonEl.disabled = true;
    }
    try {
        removeSceneImage(imageId);
        currentSceneImages = sanitizeSceneImageList(currentSceneImages).filter(function(img) {
            var sameId = imageId && String(img.id || "").trim() === imageId;
            var sameFile = filename && String(img.filename || "").trim() === filename;
            return !(sameId || sameFile);
        });
        syncSceneViewUI();
    } catch (err) {
        console.error("[scene_image_delete] Failed:", err);
        alert("Failed to delete scene image: " + (err.message || err));
        if (buttonEl) {
            buttonEl.disabled = false;
        }
    }
}

// ---------------------------------------------------------------------------
// Generate scene focus options
// ---------------------------------------------------------------------------

async function handleGenerateSceneImage() {
    if (!generatedCharacter || !environmentData || isGeneratingSceneImage || isLoadingSceneFocusOptions) return;
    isLoadingSceneFocusOptions = true;
    pendingSceneFocusOptions = [];
    isGeneratingSceneImage = true;
    syncSceneViewUI();
    try {
        var data = await generateSceneFocusOptions(generatedCharacter, environmentData, generatedCharacter.inventory || [], actionHistory, currentStoryLog);
        if (!data || !Array.isArray(data.options)) {
            throw new Error('Failed to generate scene focus options');
        }
        pendingSceneFocusOptions = data.options.map(function(v) { return String(v || "").trim(); }).filter(Boolean).slice(0, 5);
        if (pendingSceneFocusOptions.length === 0) {
            throw new Error('No scene focus options returned');
        }
    } catch (err) {
        console.error("[scene_focus] Failed:", err);
        alert("Failed to load scene options: " + (err.message || err));
    } finally {
        isLoadingSceneFocusOptions = false;
        isGeneratingSceneImage = false;
        syncSceneViewUI();
    }
}

// ---------------------------------------------------------------------------
// Generate scene image for chosen focus
// ---------------------------------------------------------------------------

async function generateSceneImageForFocus(focusPreference) {
    if (!generatedCharacter || !environmentData || isGeneratingSceneImage) return false;
    var focusText = String(focusPreference || "").trim();
    if (!focusText) return false;
    isGeneratingSceneImage = true;
    pendingSceneFocusOptions = [];
    manualSceneFocusText = "";
    syncSceneViewUI();
    try {
        var data = await generateSceneImage(generatedCharacter, environmentData, generatedCharacter.inventory || [], actionHistory, currentStoryLog, focusText);
        if (!data || data.error) {
            throw new Error((data && data.error) || 'Failed to generate scene image');
        }
        storeSceneImage(data);
        currentSceneImages = sanitizeSceneImageList((currentSceneImages || []).concat([data]));
        await saveFullProgress(generatedCharacter, environmentData, actionHistory);
        isGeneratingSceneImage = false;
        syncSceneViewUI();
        setSceneViewExpanded(true);
        showImageGeneratedToast(data.url);
        return true;
    } catch (err) {
        console.error("[scene_image] Failed:", err);
        alert("Failed to generate scene image: " + (err.message || err));
        return false;
    } finally {
        isGeneratingSceneImage = false;
        syncSceneViewUI();
    }
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

function showImageGeneratedToast(url) {
    var existing = document.getElementById('sceneImageToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'sceneImageToast';
    toast.setAttribute('role', 'status');
    toast.innerHTML =
        '<span class="scene-toast-icon">&#128247;</span>' +
        '<span class="scene-toast-text">Image generated &mdash; click to open</span>' +
        '<button class="scene-toast-dismiss" aria-label="Dismiss" title="Dismiss">&times;</button>';

    document.body.appendChild(toast);

    // Slide in
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            toast.classList.add('scene-toast-visible');
        });
    });

    function openImage() {
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    }

    toast.addEventListener('click', function(e) {
        if (e.target.classList.contains('scene-toast-dismiss')) {
            dismissToast();
        } else {
            openImage();
        }
    });

    var autoDismiss = setTimeout(dismissToast, 8000);

    function dismissToast() {
        clearTimeout(autoDismiss);
        toast.classList.remove('scene-toast-visible');
        toast.addEventListener('transitionend', function() { toast.remove(); }, { once: true });
    }
}

// ---------------------------------------------------------------------------
// Toggle button wiring (called from app.js during init)
// ---------------------------------------------------------------------------

function initSceneViewToggle() {
    var sceneViewToggleBtn = document.getElementById('sceneViewToggleBtn');
    if (sceneViewToggleBtn) {
        sceneViewToggleBtn.addEventListener("click", function() {
            setSceneViewExpanded(!isSceneViewExpanded);
        });
    }
}
