const API_KEY = "YOUR_API_KEY_HERE";
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

// build prompt based on mode
function buildPrompt(userQuestion, mode) {
  const extra = (userQuestion && String(userQuestion).trim())
    ? "\n\nAdditional hint from user: " + userQuestion.trim()
    : "";

  if (mode === "multi") {
    return (
      "The screenshot shows a quiz question (Python) with answer choices.\n\n" +
      "NOTE: This question may have MULTIPLE CORRECT ANSWERS or just ONE.\n\n" +
      "Rules:\n" +
      "1. Read the question on screen carefully.\n" +
      "2. Analyze ALL answers exactly.\n" +
      "3. Select ALL correct answers.\n" +
      "4. Return full text of each correct answer, one per line.\n" +
      "5. No numbers, letters, comments or explanations - only answer text.\n" +
      extra
    );
  }

  if (mode === "open") {
    return (
      "The screenshot shows an open question (Python) - NO answer choices.\n\n" +
      "Rules:\n" +
      "1. Read the question on screen carefully.\n" +
      "2. Answer with code, value or sentence as needed.\n" +
      "3. If code is needed, provide only code (no explanation, no markdown).\n" +
      "4. If value or name is needed, provide only that.\n" +
      "5. Keep answer short and precise.\n" +
      extra
    );
  }

  // single answer (default)
  return (
    "The screenshot shows a quiz question (Python) with answer choices.\n\n" +
    "Rules:\n" +
    "1. Read the question on screen carefully.\n" +
    "2. Analyze ALL answers.\n" +
    "3. Select ONE correct answer.\n" +
    "4. Return ONLY the full text of correct answer (no numbers, letters, comments).\n" +
    "5. No extra text.\n" +
    "6. If answers are similar, pick the most precise one.\n" +
    extra
  );
}

function isModelNotFoundError(err) {
  const msg = (err && err.message) ? String(err.message) : "";
  return /not found|does not support|invalid model/i.test(msg);
}

function isQuotaExceededError(err) {
  const msg = (err && err.message) ? String(err.message) : "";
  return /quota exceeded|limit:\s*0|exceeded your current quota/i.test(msg);
}

function shouldTryNextModel(modelName, err) {
  const msg = (err && err.message) ? String(err.message) : "";
  return (
    (isModelNotFoundError({ message: msg }) ||
      isQuotaExceededError({ message: msg })) &&
    GEMINI_MODELS.indexOf(modelName) >= 0 &&
    GEMINI_MODELS.indexOf(modelName) < GEMINI_MODELS.length - 1
  );
}

// call gemini api with fallback to next model
function callGemini(modelName, body, sendResponse) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .then((data) => {
      const err = data.error;
      if (err) {
        const msg = err.message || "Gemini API error.";
        if (shouldTryNextModel(modelName, { message: msg })) {
          const idx = GEMINI_MODELS.indexOf(modelName);
          callGemini(GEMINI_MODELS[idx + 1], body, sendResponse);
          return;
        }
        sendResponse({ error: msg });
        return;
      }
      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const raw = part?.text;
      const finishReason = candidate?.finishReason;
      const blockReason = candidate?.finishReason === "SAFETY" ? "Response blocked (SAFETY)." : null;
      if (!raw && blockReason) {
        sendResponse({ error: blockReason });
        return;
      }
      if (!raw) {
        sendResponse({ error: "No response from model." + (finishReason ? " finishReason: " + finishReason : "") });
        return;
      }
      sendResponse({ text: raw.trim() });
    })
    .catch(() => {
      sendResponse({
        error: "Failed. Check API key or connection.",
      });
    });
}

const STORAGE_KEY_PREFIX = "weryfikator_rect_";

// message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getTabId") {
    sendResponse({ tabId: sender.tab?.id ?? null });
    return false;
  }

  if (message.type === "saveRect") {
    const tabId = sender.tab?.id;
    if (tabId == null) {
      sendResponse({ ok: false });
      return false;
    }
    chrome.storage.local
      .set({ [STORAGE_KEY_PREFIX + tabId]: message.rect })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "getRect") {
    const tabId = sender.tab?.id;
    if (tabId == null) {
      sendResponse({ rect: null });
      return false;
    }
    chrome.storage.local
      .get(STORAGE_KEY_PREFIX + tabId)
      .then((data) => sendResponse({ rect: data[STORAGE_KEY_PREFIX + tabId] ?? null }));
    return true;
  }

  // capture visible tab screenshot
  if (message.type === "capture") {
    const windowId = sender.tab?.windowId ?? null;
    chrome.tabs.captureVisibleTab(windowId, { format: "png" })
      .then((dataUrl) => {
        sendResponse({ dataUrl });
      })
      .catch((err) => {
        sendResponse({ error: (err && err.message) || "Screenshot error." });
      });
    return true;
  }

  if (message.type === "analyzeImage") {
    const { base64, question, mode } = message;
    if (!base64) {
      sendResponse({ error: "No image." });
      return false;
    }
    const promptText = buildPrompt(question, mode);
    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64,
              },
            },
            { text: promptText },
          ],
        },
      ],
    };
    callGemini(GEMINI_MODELS[0], body, sendResponse);
    return true;
  }

  if (message.type === "saveQuestion") {
    chrome.storage.local.set({ weryfikator_question: message.question || "" })
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "getQuestion") {
    chrome.storage.local.get("weryfikator_question")
      .then((data) => sendResponse({ question: data.weryfikator_question || "" }));
    return true;
  }

  return false;
});
