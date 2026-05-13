# StudyCode: Advanced IDE & AI Compiler

<div align="center">
  <img src="studycode_logo.png" alt="StudyCode Logo" width="200"/>
</div>

## Overview

StudyCode is an advanced, browser-based IDE and AI compiler designed to provide a seamless, portable coding experience. Built with performance and aesthetics in mind, StudyCode allows developers to write, compile, and execute code directly in their browser without the need for complex local environment setups. It bridges the gap between learning and professional software development by integrating AI-assisted workflows and real-time execution sandboxes.

## Features

- **Frontend & Backend Workspaces:** Switch effortlessly between a frontend web playground (HTML, CSS, JS) and a simulated backend terminal environment.
- **In-Browser Compilation:** Execute Python directly in the browser via Pyodide, with simulated environments for other languages.
- **AI Agent Integration:** Built-in sidebar interface supporting multiple AI models (Claude, Gemini, DeepSeek, Nexify Quantum) to assist with debugging, coding, and architecture.
- **Rich Editor Experience:** Powered by CodeMirror with syntax highlighting, auto-completion, and bracket matching (The "VS Code Experience").
- **Portable "Java Lab" Gateway:** Includes a gateway utility to facilitate quick execution and testing of academic algorithms.
- **Premium Apple-Style UI:** Responsive, minimalist dark mode interface designed using Tailwind CSS.

## Architecture

StudyCode is a lightweight, purely client-side application requiring no complex build steps or backend deployment. 

- **Frontend Core:** Plain HTML5, Tailwind CSS via CDN.
- **Code Editor:** CodeMirror 5 with various language modes and addons.
- **Execution Engines:** 
  - Pyodide for real-time Python execution in the browser.
  - Interactive IFrames for live frontend previews.
- **AI Integration:** Client-side JavaScript handling API requests to multiple AI providers, complete with a custom workflow and model selection UI.

## File Structure

```text
.
├── index.html             # Main IDE application entry point
├── studycode.js           # Core IDE logic, editor initialization, and execution engines
├── study-ai-auth.html     # Authentication and session management UI
├── gateway/               # Portable laboratory gateway and algorithms
│   ├── index.html         # Gateway UI
│   ├── menu.sh / .ps1     # CLI menu scripts
│   └── p1.txt - p8.txt    # Code payloads/algorithms
├── scripts/               # Maintenance and API patch scripts
│   ├── patch_studycode.js
│   └── patch_studycode_api.js
└── studycode_logo.png     # Application branding
```

## Setup & Usage

Since StudyCode is a client-side application, getting started is extremely simple:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/siddiquikashif8600-arc/study-code.git
   cd study-code
   ```

2. **Serve locally:**
   You can use any local web server to run the application. For example, using Python:
   ```bash
   python -m http.server 8000
   ```
   
3. **Open your browser:**
   Navigate to `http://localhost:8000/studycode.html`.

## Roadmap

- [ ] Transition from CDN dependencies to a modern bundler (Vite/Webpack).
- [ ] Migrate CodeMirror 5 to CodeMirror 6 for better performance and extensibility.
- [ ] Implement true backend execution via a containerized sandbox API.
- [ ] Add comprehensive test coverage using Jest/Cypress.
- [ ] Implement secure credential management for AI API keys.

## Contribution Guidelines

We welcome contributions from the community to make StudyCode better!

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes with descriptive messages (`git commit -m 'Add amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure your code adheres to the existing style and architecture. Avoid introducing unnecessary complexity or heavy frameworks.

## License

This project is open-source and available under the [MIT License](LICENSE).
