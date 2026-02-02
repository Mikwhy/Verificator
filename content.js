(function () {
  "use strict";

  const SELECTOR_OVERLAY_ID = "weryfikator-selector-overlay";
  const RESULT_OVERLAY_ID = "weryfikator-result-overlay";
  const QUESTION_INPUT_ID = "weryfikator-question";
  const RESULT_DURATION_MS = 5000;
  const NO_RECT_MESSAGE_MS = 2000;

  function getTabId() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "getTabId" }, (r) => {
        resolve(r?.tabId ?? null);
      });
    });
  }

  function saveRect(rect) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "saveRect", rect }, (r) => {
        resolve(r?.ok === true);
      });
    });
  }

  function getRect() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "getRect" }, (r) => {
        resolve(r?.rect ?? null);
      });
    });
  }

  function hideSelectorOverlay() {
    const el = document.getElementById(SELECTOR_OVERLAY_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // create selection overlay for area picking
  function createSelectorOverlay() {
    hideSelectorOverlay();
    const overlay = document.createElement("div");
    overlay.id = SELECTOR_OVERLAY_ID;
    overlay.className = "weryfikator-selector-overlay";
    const box = document.createElement("div");
    box.className = "weryfikator-selector-box";
    overlay.appendChild(box);

    let startX = 0;
    let startY = 0;
    let isDrawing = false;

    function updateBox(clientX, clientY) {
      const left = Math.min(startX, clientX);
      const top = Math.min(startY, clientY);
      const width = Math.abs(clientX - startX);
      const height = Math.abs(clientY - startY);
      box.style.left = left + "px";
      box.style.top = top + "px";
      box.style.width = width + "px";
      box.style.height = height + "px";
    }

    overlay.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = startX + "px";
      box.style.top = startY + "px";
      box.style.width = "0px";
      box.style.height = "0px";
      box.style.display = "block";
    });

    overlay.addEventListener("mousemove", (e) => {
      if (!isDrawing) return;
      updateBox(e.clientX, e.clientY);
    });

    overlay.addEventListener("mouseup", async (e) => {
      if (e.button !== 0 || !isDrawing) return;
      isDrawing = false;
      const left = Math.min(startX, e.clientX);
      const top = Math.min(startY, e.clientY);
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);
      if (width < 10 || height < 10) {
        hideSelectorOverlay();
        return;
      }
      const rect = { x: left, y: top, width, height };
      const tabId = await getTabId();
      if (tabId != null) {
        await saveRect(rect);
      }
      hideSelectorOverlay();
    });

    (document.body || document.documentElement).appendChild(overlay);
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function getResultEl() {
    return document.getElementById(RESULT_OVERLAY_ID);
  }

  function ensureResultContainer() {
    if (document.getElementById(RESULT_OVERLAY_ID)) return;
    const root = document.body || document.documentElement;
    if (!root) return;
    const el = document.createElement("div");
    el.id = RESULT_OVERLAY_ID;
    el.setAttribute("class", "weryfikator-result-overlay");
    el.style.cssText =
      "display:none;position:fixed;bottom:20px;right:20px;z-index:2147483646;max-width:320px;max-height:200px;overflow:auto;padding:12px 14px;" +
      "background:#1e1e1e;color:#f0f0f0;font-family:system-ui,sans-serif;font-size:13px;line-height:1.4;" +
      "border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid #444;" +
      "white-space:pre-wrap;word-break:break-word;text-align:left;";
    root.appendChild(el);
  }

  function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  }

  // show result message
  function showMessage(text, durationMs, shouldCopy) {
    ensureResultContainer();
    const el = getResultEl();
    const safeText = text == null ? "" : String(text);
    const htmlContent = escapeHtml(safeText).replace(/\n/g, "<br>");
    
    if (shouldCopy && safeText) {
      copyToClipboard(safeText);
    }
    
    if (el) {
      el.innerHTML = htmlContent || "<span style='opacity:0.8'>No content.</span>";
      el.style.display = "block";
      clearTimeout(showMessage._hideTimer);
      showMessage._hideTimer = setTimeout(() => {
        el.style.display = "none";
      }, durationMs);
      return;
    }
    const fallback = document.createElement("div");
    fallback.style.cssText =
      "position:fixed;bottom:20px;right:20px;z-index:2147483646;max-width:320px;max-height:200px;overflow:auto;padding:12px 14px;" +
      "background:#1e1e1e;color:#f0f0f0;font-family:system-ui,sans-serif;font-size:13px;line-height:1.4;" +
      "border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid #444;" +
      "white-space:pre-wrap;word-break:break-word;text-align:left;";
    fallback.innerHTML = htmlContent || "<span style='opacity:0.8'>No content.</span>";
    (document.body || document.documentElement).appendChild(fallback);
    setTimeout(() => {
      if (fallback.parentNode) fallback.parentNode.removeChild(fallback);
    }, durationMs);
  }

  // crop screenshot to selected area
  function cropScreenshotToBase64(dataUrl, rect) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scaleX = img.width / window.innerWidth;
        const scaleY = img.height / window.innerHeight;
        const sx = Math.round(rect.x * scaleX);
        const sy = Math.round(rect.y * scaleY);
        const sw = Math.round(rect.width * scaleX);
        const sh = Math.round(rect.height * scaleY);
        if (sw <= 0 || sh <= 0) {
          reject(new Error("Invalid crop size"));
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        const data = canvas.toDataURL("image/png");
        const base64 = data.indexOf(",") >= 0 ? data.slice(data.indexOf(",") + 1) : data;
        resolve(base64);
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = dataUrl;
    });
  }

  // run ai analysis on selected area
  async function runAnalysis(questionOverride, mode) {
    const rect = await getRect();
    if (!rect) {
      showMessage("First select area (extension icon -> Select area)", NO_RECT_MESSAGE_MS);
      return;
    }

    const modeLabel = mode === "multi" ? "F3: multiple answers" : mode === "open" ? "F4: open question" : "F2: single answer";
    showMessage(modeLabel + " - analyzing...", 60000);

    const question = (questionOverride != null && String(questionOverride).trim()) !== ""
      ? String(questionOverride).trim()
      : (document.getElementById(QUESTION_INPUT_ID) && document.getElementById(QUESTION_INPUT_ID).value) || "";

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "capture" }, async (captureResp) => {
        if (chrome.runtime.lastError) {
          showMessage("Error: " + (chrome.runtime.lastError.message || "Failed"), RESULT_DURATION_MS);
          resolve();
          return;
        }
        if (captureResp?.error) {
          showMessage("Error: " + captureResp.error, RESULT_DURATION_MS);
          resolve();
          return;
        }
        let base64;
        try {
          base64 = await cropScreenshotToBase64(captureResp.dataUrl, rect);
        } catch (err) {
          showMessage("Error cropping area.", RESULT_DURATION_MS);
          resolve();
          return;
        }
        chrome.runtime.sendMessage({ type: "analyzeImage", base64, question, mode }, (analyzeResp) => {
          if (chrome.runtime.lastError) {
            showMessage("Extension error: " + (chrome.runtime.lastError.message || "unknown"), RESULT_DURATION_MS);
            resolve();
            return;
          }
          if (!analyzeResp) {
            showMessage("Error: no response from background.", RESULT_DURATION_MS);
            resolve();
            return;
          }
          if (analyzeResp.error) {
            showMessage("Error: " + analyzeResp.error, RESULT_DURATION_MS);
            resolve();
            return;
          }
          const text = analyzeResp.text != null ? String(analyzeResp.text).trim() : "";
          showMessage(text || "No response from model.", RESULT_DURATION_MS, true);
          resolve();
        });
      });
    });
  }

  // message listener
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "showSelector") {
      createSelectorOverlay();
      sendResponse({ ok: true });
      return false;
    }
    if (message.type === "runAnalysis") {
      runAnalysis(message.question, message.mode).catch((err) => {
        showMessage("Error: " + (err && err.message ? err.message : String(err)), RESULT_DURATION_MS);
      });
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });

  function getSavedQuestion() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "getQuestion" }, (r) => {
        if (chrome.runtime.lastError) {
          resolve("");
          return;
        }
        resolve(r?.question || "");
      });
    });
  }

  let isAnalyzing = false;

  async function triggerAnalysisFromKey(mode) {
    if (isAnalyzing) return;
    isAnalyzing = true;
    try {
      const question = await getSavedQuestion();
      await runAnalysis(question, mode);
    } catch (err) {
      showMessage("Error: " + (err && err.message ? err.message : String(err)), RESULT_DURATION_MS);
    } finally {
      isAnalyzing = false;
    }
  }

  // hotkey handler: f2=single, f3=multi, f4=open
  function handleHotkey(e) {
    const key = e.key;
    const code = e.code;
    
    if (key === "F2" || code === "F2") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      triggerAnalysisFromKey("single");
      return false;
    }
    
    if (key === "F3" || code === "F3") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      triggerAnalysisFromKey("multi");
      return false;
    }
    
    if (key === "F4" || code === "F4") {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      triggerAnalysisFromKey("open");
      return false;
    }
  }

  window.addEventListener("keydown", handleHotkey, true);
  window.addEventListener("keyup", handleHotkey, true);
  document.addEventListener("keydown", handleHotkey, true);
  document.addEventListener("keyup", handleHotkey, true);
  
  if (document.body) {
    document.body.addEventListener("keydown", handleHotkey, true);
    document.body.addEventListener("keyup", handleHotkey, true);
  }
})();
