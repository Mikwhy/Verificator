# Verificator

[![Website](https://img.shields.io/badge/Website-mikwhy.dev-blue?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mikwhy.dev)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?style=for-the-badge&logo=googlechrome&logoColor=white)]()
[![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-orange?style=for-the-badge&logo=google&logoColor=white)]()

---

**[English](#english)** | **[Polski](#polski)**

---

## English

### What is Verificator?

A Chrome extension that uses **Gemini AI** to instantly answer quiz questions from screenshots. Select an area on the screen, press a hotkey, and get the answer - all without losing focus on your quiz.

### Features

- **F2** - Single correct answer
- **F3** - Multiple correct answers  
- **F4** - Open question (text/code answer)
- Auto-copy answer to clipboard
- Works on any website
- Model fallback (2.5 Flash → 2.0 Flash → 1.5 Flash)

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Mikwhy/Verificator.git
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (top right)

4. Click **Load unpacked** and select the `Verificator` folder

5. Add your Gemini API key in `background.js`:
   ```javascript
   const API_KEY = "YOUR_API_KEY_HERE";
   ```

6. Get your free API key at [Google AI Studio](https://aistudio.google.com/apikey)

### Usage

1. Click the extension icon → **Select area**
2. Draw a rectangle around the quiz question
3. Press **F2** (single), **F3** (multiple), or **F4** (open)
4. Answer appears in the corner and is copied to clipboard

---

## Polski

### Czym jest Verificator?

Rozszerzenie Chrome wykorzystujące **Gemini AI** do natychmiastowego odpowiadania na pytania quizowe ze zrzutów ekranu. Zaznacz obszar, naciśnij skrót klawiszowy i otrzymaj odpowiedź - bez utraty focusa na quizie.

### Funkcje

- **F2** - Jedna poprawna odpowiedź
- **F3** - Kilka poprawnych odpowiedzi
- **F4** - Pytanie otwarte (odpowiedź tekstowa/kod)
- Automatyczne kopiowanie odpowiedzi do schowka
- Działa na każdej stronie
- Fallback modeli (2.5 Flash → 2.0 Flash → 1.5 Flash)

### Instalacja

1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/Mikwhy/Verificator.git
   ```

2. Otwórz Chrome i przejdź do `chrome://extensions/`

3. Włącz **Tryb dewelopera** (prawy górny róg)

4. Kliknij **Załaduj rozpakowane** i wybierz folder `Verificator`

5. Dodaj swój klucz API Gemini w `background.js`:
   ```javascript
   const API_KEY = "YOUR_API_KEY_HERE";
   ```

6. Darmowy klucz API dostaniesz na [Google AI Studio](https://aistudio.google.com/apikey)

### Użycie

1. Kliknij ikonę rozszerzenia → **Select area**
2. Narysuj prostokąt wokół pytania quizowego
3. Naciśnij **F2** (jedna), **F3** (kilka) lub **F4** (otwarte)
4. Odpowiedź pojawi się w rogu ekranu i zostanie skopiowana do schowka

---

## License

MIT License - feel free to use and modify.

---

<p align="center">
  <a href="https://mikwhy.dev">
    <img src="https://img.shields.io/badge/Made%20by-Mikwhy-black?style=for-the-badge" alt="Made by Mikwhy">
  </a>
</p>
