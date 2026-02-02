(function () {
  "use strict";

  const btnSelect = document.getElementById("weryfikator-btn-select");
  const btnAnalyze = document.getElementById("weryfikator-btn-analyze");
  const questionInput = document.getElementById("weryfikator-popup-question");
  const status = document.getElementById("weryfikator-popup-status");

  function setStatus(text, isError) {
    status.textContent = text || "";
    status.className = "weryfikator-popup-status" + (isError ? " error" : text ? " success" : "");
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  function isRestrictedUrl(url) {
    return !url || url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:");
  }

  // select area button
  btnSelect.addEventListener("click", async () => {
    setStatus("", false);
    try {
      const tab = await getActiveTab();
      if (!tab?.id) {
        setStatus("No active tab.", true);
        return;
      }
      if (isRestrictedUrl(tab.url)) {
        setStatus("Works on web pages. Open a website and try again.", true);
        return;
      }
      await chrome.tabs.sendMessage(tab.id, { type: "showSelector" });
      setStatus("Select area on page.", false);
      window.close();
    } catch (err) {
      setStatus("Open a website and try again.", true);
    }
  });

  // analyze button
  btnAnalyze.addEventListener("click", async () => {
    setStatus("", false);
    try {
      const tab = await getActiveTab();
      if (!tab?.id) {
        setStatus("No active tab.", true);
        return;
      }
      if (isRestrictedUrl(tab.url)) {
        setStatus("Works on web pages.", true);
        return;
      }
      const question = (questionInput && questionInput.value) ? questionInput.value.trim() : "";
      await chrome.runtime.sendMessage({ type: "saveQuestion", question });
      await chrome.tabs.sendMessage(tab.id, { type: "runAnalysis", question });
      setStatus("Analyzing - result on page.", false);
      window.close();
    } catch (err) {
      setStatus("Open a website and try again.", true);
    }
  });
})();
