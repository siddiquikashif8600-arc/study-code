// ======= STATE & INITIALIZATION =======
let currentMode = 'frontend';
let pyodideReady = false;
let pyodideObj = null;
let edFeHtml, edFeCss, edFeJs, edBackend;

// Register global functions immediately
window.switchMode = (mode) => { if(window._switchMode) window._switchMode(mode); };
window.switchFile = (pane, lang) => { if(window._switchFile) window._switchFile(pane, lang); };
window.changeBackendLang = () => { if(window._changeBackendLang) window._changeBackendLang(); };
window.compileCode = (interaction) => { if(window._compileCode) window._compileCode(interaction); };
window.setAgentModel = (id, label, icon) => {
    const sel = document.getElementById('agentSelector');
    const disp = document.getElementById('agentDisplay');
    const dd = document.getElementById('selectorDropdown');
    if (sel) sel.value = id;
    if (disp) disp.innerHTML = icon + ' ' + label;
    if (dd) dd.classList.add('hidden');
};
window.setWorkflowType = (val, txt) => {
    const sel = document.getElementById('workflowSelector');
    const disp = document.getElementById('workflowDisplay');
    const dd = document.getElementById('workflowDropdown');
    if (sel) sel.value = val;
    if (disp) disp.innerHTML = txt;
    if (dd) dd.classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    const cmConfig = { 
        theme: 'material-ocean', 
        lineNumbers: true, 
        lineWrapping: true, 
        indentUnit: 4, 
        styleActiveLine: true, 
        matchBrackets: true,
        autoCloseBrackets: true,
        autoCloseTags: true,
        extraKeys: {"Ctrl-Space": "autocomplete"}
    };

    try {
        edFeHtml = CodeMirror(document.getElementById('editor-fe-html'), { ...cmConfig, mode: 'xml', value: '<div class="min-h-screen bg-slate-900 flex items-center justify-center">\n  <div class="text-center">\n    <h1 class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-4">\n      StudyCode Frontend\n    </h1>\n    <p class="text-slate-400 font-mono">HTML + CSS + JS fully synced.</p>\n  </div>\n</div>' });
        edFeCss = CodeMirror(document.getElementById('editor-fe-css'), { ...cmConfig, mode: 'css', value: 'body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}' });
        edFeJs = CodeMirror(document.getElementById('editor-fe-js'), { ...cmConfig, mode: 'javascript', value: 'console.log("Frontend compiled successfully!");' });
        edBackend = CodeMirror(document.getElementById('editor-backend'), { ...cmConfig, mode: 'python', value: '# Python 3 Environment (Powered by Pyodide)\ndef calculate_gravity(mass):\n    g = 9.81\n    return mass * g\n\nprint("Antigravity Engine Booting...")\nprint("Force acting on 50kg:", calculate_gravity(50), "N")' });

        setupAutocomplete(edFeHtml);
        setupAutocomplete(edFeCss);
        setupAutocomplete(edFeJs);
        setupAutocomplete(edBackend);

        setTimeout(() => { edFeHtml.refresh(); }, 100);
        initPyodide();
        
        // Hook up change events for live server
        edFeHtml.on('change', triggerLiveServer);
        edFeCss.on('change', triggerLiveServer);
        edFeJs.on('change', triggerLiveServer);

        // Success - app ready
        setTimeout(() => compileCode(false), 800);
    } catch (e) {
        console.error("IDE Initialization Error:", e);
        writeTerminal("ERROR", "Initialization failed: Is CodeMirror loaded correctly?");
    }
});

async function initPyodide() {
    try { pyodideObj = await loadPyodide(); pyodideReady = true; writeTerminal("SYSTEM", "Pyodide WASM runtime successfully loaded in browser.\\n"); }
    catch (err) { writeTerminal("ERROR", "Failed to load Pyodide: " + err.message); }
}

// ======= ANTIGRAVITY AUTOCOMPLETE (CURSOR STYLE) =======
const suggestionsDB = {
    html: ['div', 'span', 'section', 'article', 'header', 'footer', 'button', 'input', 'img', 'script', 'link', 'canvas', 'video', 'audio', 'form', 'label', 'ul', 'li', 'ol', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'body', 'head', 'html', 'title', 'meta', 'style'],
    css: ['margin', 'padding', 'display: flex', 'display: grid', 'background:', 'color:', 'border:', 'border-radius:', 'font-family:', 'font-size:', 'position: relative', 'position: absolute', 'transition:', 'animation:', 'box-shadow:', 'z-index:', 'width:', 'height:', 'top:', 'left:', 'right:', 'bottom:', 'align-items: center', 'justify-content: center', 'flex-direction: column'],
    javascript: ['console.log()', 'document.getElementById()', 'const', 'let', 'function', 'addEventListener()', 'setTimeout()', 'setInterval()', 'fetch()', 'JSON.parse()', 'JSON.stringify()', 'Math.random()', 'Array.from()', 'Object.keys()', 'async', 'await', 'return', 'if () {} else {}', 'for (let i=0; i<n; i++) {}', 'while', 'switch', 'case', 'break', 'continue', 'export', 'import'],
    python: ['print()', 'def', 'class', 'import', 'from', 'if', 'else:', 'elif', 'for', 'while', 'try:', 'except:', 'finally:', 'with', 'as', 'lambda', 'return', 'yield', 'pass', 'break', 'continue', 'True', 'False', 'None', 'range()', 'len()', 'enumerate()', 'zip()', 'open()']
};

let currentGhostMarker = null;

function showGhostText(cm) {
    if (currentGhostMarker) { currentGhostMarker.clear(); currentGhostMarker = null; }
    
    const cursor = cm.getCursor();
    const line = cm.getLine(cursor.line);
    if (!line) return;
    const before = line.slice(0, cursor.ch);
    
    const match = before.match(/[\w\-:]+$/);
    if (!match) return;
    
    const word = match[0];
    const mode = cm.getOption('mode');
    let lang = 'javascript';
    if (mode === 'xml') lang = 'html';
    else if (mode === 'css') lang = 'css';
    else if (typeof mode === 'string' && mode.includes('python')) lang = 'python';

    const suggestions = suggestionsDB[lang] || [];
    const suggestion = suggestions.find(s => s.toLowerCase().startsWith(word.toLowerCase()) && s.toLowerCase() !== word.toLowerCase());
    
    if (suggestion) {
        const remainder = suggestion.slice(word.length);
        const ghostNode = document.createElement('span');
        ghostNode.className = 'cm-ghost-text';
        ghostNode.innerText = remainder;
        
        currentGhostMarker = cm.setBookmark(cursor, { widget: ghostNode, insertLeft: true });
        cm._activeSuggestion = suggestion;
        cm._activeWord = word;
        showHintPopup(cm, suggestion);
    } else {
        cm._activeSuggestion = null;
        hideHintPopup();
    }
}

let currentHintPopup = null;
function showHintPopup(cm, text) {
    hideHintPopup();
    const pos = cm.cursorCoords(true);
    const popup = document.createElement('div');
    popup.className = 'antigravity-hint-popup fixed pointer-events-none opacity-0 transition-opacity duration-200';
    popup.innerHTML = `<span class="text-indigo-400 font-bold">Antigravity:</span> ${text} <span class="bg-gray-700 px-1 rounded ml-2 text-[10px]">TAB</span>`;
    document.body.appendChild(popup);
    popup.style.left = pos.left + 'px';
    popup.style.top = (pos.bottom + 5) + 'px';
    setTimeout(() => popup.classList.remove('opacity-0'), 10);
    currentHintPopup = popup;
}

function hideHintPopup() {
    if (currentHintPopup) {
        currentHintPopup.remove();
        currentHintPopup = null;
    }
}

function setupAutocomplete(cm) {
    cm.on('inputRead', (cm) => { showGhostText(cm); });
    cm.on('keyup', (cm, e) => {
        // VS Code style auto-dropdown: only trigger if typing a visible character (length 1)
        // and ignore special keys that would break it
        if (!cm.state.completionActive && e.keyCode > 46 && e.keyCode < 91 && e.key.length === 1) {
            CodeMirror.commands.autocomplete(cm, null, {completeSingle: false});
        }
    });
    cm.on('cursorActivity', (cm) => { 
        if (currentGhostMarker) { currentGhostMarker.clear(); currentGhostMarker = null; }
        showGhostText(cm); 
    });
    cm.on('keydown', (cm, e) => {
        if (e.key === 'Tab' && cm._activeSuggestion) {
            e.preventDefault();
            const cursor = cm.getCursor();
            const word = cm._activeWord;
            const suggestion = cm._activeSuggestion;
            cm.replaceRange(suggestion.slice(word.length), cursor);
            if (currentGhostMarker) { currentGhostMarker.clear(); currentGhostMarker = null; }
            cm._activeSuggestion = null;
            hideHintPopup();
        }
    });
}

// Internal implementations
function _switchMode(mode) {
    currentMode = mode;
    document.getElementById('layoutFrontend').classList.toggle('hidden', mode !== 'frontend');
    document.getElementById('layoutBackend').classList.toggle('hidden', mode !== 'backend');
    document.getElementById('layoutBackend').classList.toggle('flex', mode === 'backend');
    document.getElementById('mode-frontend').className = mode === 'frontend' ? 'px-5 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-600 text-white shadow-md' : 'px-5 py-1.5 rounded-full text-xs font-bold transition-all text-slate-400 hover:text-white';
    document.getElementById('mode-backend').className = mode === 'backend' ? 'px-5 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-600 text-white shadow-md' : 'px-5 py-1.5 rounded-full text-xs font-bold transition-all text-slate-400 hover:text-white';
    document.getElementById('syncModeLabel').innerText = mode === 'frontend' ? 'Frontend' : 'Backend';
    if (mode === 'backend' && edBackend) edBackend.refresh();
}
window._switchMode = _switchMode;

function _switchFile(pane, lang) {
    ['html', 'css', 'js'].forEach(l => {
        const el = document.getElementById(`editor-${pane}-${l}`);
        if(el) el.classList.add('hidden');
        const tab = document.getElementById(`tab-${pane}-${l}`);
        if(tab) {
            tab.classList.remove('bg-ide-base', 'border-t-2', 'text-orange-400', 'text-blue-400', 'text-yellow-400');
            tab.classList.add('text-slate-500'); tab.style.borderColor = 'transparent';
        }
    });
    const activeEl = document.getElementById(`editor-${pane}-${lang}`);
    if(activeEl) activeEl.classList.remove('hidden');
    const activeTab = document.getElementById(`tab-${pane}-${lang}`);
    if(activeTab) {
        activeTab.classList.remove('text-slate-500'); activeTab.classList.add('bg-ide-base', 'border-t-2');
        if(lang === 'html') { activeTab.classList.add('text-orange-400'); activeTab.style.borderColor = '#fb923c'; if(edFeHtml) edFeHtml.refresh(); }
        if(lang === 'css') { activeTab.classList.add('text-blue-400'); activeTab.style.borderColor = '#60a5fa'; if(edFeCss) edFeCss.refresh(); }
        if(lang === 'js') { activeTab.classList.add('text-yellow-400'); activeTab.style.borderColor = '#facc15'; if(edFeJs) edFeJs.refresh(); }
    }
}
window._switchFile = _switchFile;

function _changeBackendLang() {
    const val = document.getElementById('backendLang').value;
    let mode = 'python'; let txt = '';
    if(val === 'python') { mode = 'python'; txt = '# Python Code Context\\nprint("Hello World from Python")'; }
    if(val === 'javascript') { mode = 'javascript'; txt = '// Node.js Sandbox Context\\nconsole.log("Hello from NodeJS Engine");'; }
    if(val === 'java') { mode = 'text/x-java'; txt = 'public class Main {\\n    public static void main(String[] args) {\\n        System.out.println("Hello Java!");\\n    }\\n}'; }
    if(val === 'c') { mode = 'text/x-csrc'; txt = '#include <stdio.h>\\n\\nint main() {\\n    printf("Hello C Developer!\\\\n");\\n    return 0;\\n}'; }
    if(edBackend) {
        edBackend.setOption('mode', mode);
        edBackend.setValue(txt);
    }
}
window._changeBackendLang = _changeBackendLang;

function writeTerminal(type, text) {
    const term = document.getElementById('terminalOutput');
    const color = type === 'ERROR' ? '#ef4444' : (type === 'SYSTEM' ? '#8b5cf6' : '#a3e635');
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});
    term.innerHTML += `<div style="margin-bottom:4px;"><span style="color:#64748b;">[${time}]</span> <span style="color:${color}; font-weight:bold;">${type}</span>&gt; ${text.replace(/</g, '&lt;')}</div>`;
    term.scrollTop = term.scrollHeight;
}

function _compileCode(interaction = true) {
    if (currentMode === 'frontend') {
        const outPanel = document.getElementById('frontendOutputPanel');
        if (outPanel && interaction) {
            outPanel.classList.remove('translate-x-full');
        }
        const loader = document.getElementById('feLoader');
        if(loader) loader.style.opacity = '1';
        setTimeout(() => {
            if(!edFeHtml || !edFeCss || !edFeJs) return;
            const htmlContent = edFeHtml.getValue();
            const cssContent = edFeCss.getValue();
            const jsContent = edFeJs.getValue();
            const scriptTag = "<scr" + "ipt";
            const endScriptTag = "</scr" + "ipt>";
            const code = `
                <!DOCTYPE html>
                <html>
                <head>
                    ${scriptTag} src="https://cdn.tailwindcss.com">${endScriptTag}
                    <style>${cssContent}</style>
                </head>
                <body>
                    ${htmlContent}
                    ${scriptTag}>
                        try { ${jsContent} }
                        catch (err) { document.body.innerHTML += '<div style="color:red; background:#fee2e2; padding:10px; margin:10px; border-radius:4px; font-family:monospace;">'+err+'</div>'; }
                    ${endScriptTag}
                </body>
                </html>
            `;
            const iframe = document.getElementById('frontendOutput');
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open(); doc.write(code); doc.close();
            if(loader) loader.style.opacity = '0';
        }, 300);
    } else {
        const langEl = document.getElementById('backendLang');
        if(!langEl) return;
        const lang = langEl.value;
        if(!edBackend) return;
        const code = edBackend.getValue();
        const loader = document.getElementById('beLoader');
        if(loader) loader.classList.remove('hidden');
        writeTerminal("EXEC", `Starting compilation task for ${lang.toUpperCase()}...`);
        setTimeout(() => {
            if (lang === 'python') {
                if (!pyodideReady) { writeTerminal("ERROR", "Pyodide engine is still booting up. Try again in 2 seconds."); }
                else {
                    try {
                        pyodideObj.runPython(`import sys, io\\nsys.stdout = io.StringIO()`);
                        pyodideObj.runPython(code);
                        const stdout = pyodideObj.runPython("sys.stdout.getvalue()");
                        if(stdout) writeTerminal("OUT", stdout); else writeTerminal("OUT", "Process exited with code 0 (No output)");
                    } catch (err) { writeTerminal("ERROR", err.toString()); }
                }
            } else if (lang === 'javascript') {
                try {
                    const logs = []; const oldLog = console.log;
                    console.log = function(...args) { logs.push(args.join(' ')); }
                    new Function(code)();
                    console.log = oldLog;
                    if(logs.length>0) writeTerminal("OUT", logs.join('\\n')); else writeTerminal("OUT", "Process exited with code 0");
                } catch (err) { writeTerminal("ERROR", err.toString()); }
            } else {
                writeTerminal("SYSTEM", `${lang.toUpperCase()} requires an external Judge0 / Docker runner which is mocked in this browser environment. Connecting to simulated output...`);
                setTimeout(() => { writeTerminal("OUT", "Compilation successful.\\nHello from the backend process!"); }, 800);
            }
            if(loader) loader.classList.add('hidden');
        }, 400);
    }
    // Auto-reveal compiler output container on mobile
    const cContainer = document.getElementById('compilerContainer');
    if (cContainer && window.innerWidth < 768 && interaction) {
        cContainer.classList.remove('hidden');
        setTimeout(() => cContainer.classList.replace('translate-x-full', 'translate-x-0'), 10);
    }
}
window._compileCode = _compileCode;

// LIVE SERVER CAPABILITY
let liveServerTimeout;
const triggerLiveServer = () => {
    clearTimeout(liveServerTimeout);
    liveServerTimeout = setTimeout(() => {
        const outPanel = document.getElementById('frontendOutputPanel');
        // Only run live-server recompile automatically if the panel is already toggled open
        if (currentMode === 'frontend' && outPanel && !outPanel.classList.contains('translate-x-full')) {
            _compileCode(false);
        }
    }, 600);
};

const aiInput = document.getElementById('agentInput');
aiInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });
aiInput.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } });

let agentHistory = []; // KEEP HISTORY across multiple turns

// IMAGE UPLOAD STATE
window._attachedImageBase64 = null;
window._attachedImageMime = null;

window.handleImgSelection = function(e) {
    const file = e.target.files[0];
    if(!file) return;
    window._attachedImageMime = file.type;
    const reader = new FileReader();
    reader.onload = function(evt) {
        window._attachedImageBase64 = evt.target.result.split(',')[1];
        document.getElementById('imgPreviewUrl').src = evt.target.result;
        const wrapper = document.getElementById('imgPreviewWrapper');
        wrapper.classList.remove('hidden');
        wrapper.style.display = 'block';
    };
    reader.readAsDataURL(file);
};

window.clearAttachedImage = function() {
    window._attachedImageBase64 = null;
    window._attachedImageMime = null;
    const input = document.getElementById('imageUploadInput');
    if (input) input.value = '';
    const imgEl = document.getElementById('imgPreviewUrl');
    if (imgEl) imgEl.src = '';
    const wrapper = document.getElementById('imgPreviewWrapper');
    if (wrapper) {
        wrapper.classList.add('hidden');
        wrapper.style.display = 'none';
    }
};

async function sendAgentMessage() {
    const input = document.getElementById('agentInput');
    const msg = input.value.trim();
    if(!msg) return;
    input.value = ''; input.style.height = 'auto';
    const modelId = document.getElementById('agentSelector').value;
    appendAgentMsg('user', msg, modelId);

    let contextCode = '';
    if(currentMode === 'frontend') contextCode = `--- HTML ---\n${edFeHtml.getValue()}\n\n--- CSS ---\n${edFeCss.getValue()}\n\n--- JS ---\n${edFeJs.getValue()}`;
    else contextCode = `--- ${document.getElementById('backendLang').value.toUpperCase()} Code ---\n${edBackend.getValue()}`;

    let sysPrompt = "You are a Senior Software Engineer strictly representing " + modelId + " inside StudyCode IDE.\nCurrently looking at: " + currentMode + " mode.\nCode context:\n" + contextCode + "\n\nProvide fixes or build features. IMPORTANT: ONLY wrap actual code inside standard markdown code blocks (e.g. ```html or ```python). Conversational text and non-code explanations MUST be OUTSIDE the code blocks. Be extremely brief in non-code explanations. Speak in the persona of " + modelId + "!";

    const workflowType = document.getElementById('workflowSelector') ? document.getElementById('workflowSelector').value : 'fast';

    const thinkingModels = ['gemini', 'gpt-4o', 'nexify', 'claude-k-410a', 'deepseek', 'kimi'];
    if (workflowType === 'thinking' && thinkingModels.includes(modelId)) {
        sysPrompt += "\n\nCRITICAL AGENTIC WORKFLOW (Antigravity System):\n1. When the user asks for a feature or change, DO NOT WRITE ANY CODE BLOCKS YET. First, respond calmly like a human. Then use a <thought></thought> block to outline your plan of implementation. End by asking the user 'Should I proceed?'.\n2. IF AND ONLY IF the user says 'okay', 'yes', or approves the plan, then provide the full implementation inside standard markdown code blocks.\n3. DO NOT output code blocks unless the user has explicitly approved the plan, because your code blocks are automatically executed onto the user's environment immediately.";
    }

    const typingId = 'typing-' + Date.now();
    appendTyping(typingId, modelId);
    try {
        let fullText = "";
        let success = false;
        
        if (modelId === 'qwen-3.5') {
            // DETECT ENVIRONMENT: Support local file opening (file://)
            let invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
            const isLocalFile = window.location.protocol === 'file:';
            if (isLocalFile) {
                invokeUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://integrate.api.nvidia.com/v1/chat/completions");
            } else {
                invokeUrl = "/.netlify/functions/nvidia";
            }
            let apiKey = localStorage.getItem('STUDYCODE_NVIDIA_KEY');
            if (isLocalFile && !apiKey) {
                apiKey = prompt("Please enter your NVIDIA API Key for Qwen model:");
                if (apiKey) localStorage.setItem('STUDYCODE_NVIDIA_KEY', apiKey.trim());
                else {
                    appendAgentMsg('ai', "<span class='text-red-400'>NVIDIA API Key required for local execution.</span>", modelId);
                    document.getElementById(typingId)?.remove();
                    return;
                }
            } else if (!isLocalFile && !apiKey) {
                apiKey = "NVIDIA_API_KEY_HIDDEN_1"; // Proxy handles it
            }

            const systemPrefix = sysPrompt + "\n\nIdentity Role: You are simulating " + modelId + ".\n\n";
            let historyStr = agentHistory.map(m => m.role.toUpperCase() + ": " + m.content).join("\n\n");
            const fullPromptQwen = systemPrefix + (historyStr ? historyStr + "\n\nUSER: " + msg : "USER: " + msg);

            const messages = [
                { role: "user", content: fullPromptQwen }
            ];

            const payload = {
                model: "qwen/qwen3.5-397b-a17b",
                messages: messages,
                temperature: 0.60,
                top_p: 0.95,
                top_k: 20,
                max_tokens: 16384,
                stream: false,
                chat_template_kwargs: {"enable_thinking":true}
            };

            try {
                const res = await fetch(invokeUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (res.ok && data.choices && data.choices[0].message) {
                    fullText = data.choices[0].message.content;
                    success = true;
                } else {
                    const errorMsg = data?.error?.message || `API Error HTTP ${res.status}`;
                    console.error(`Qwen API failed:`, errorMsg);
                    fullText = `<span class='text-amber-400'>Qwen API Error: ${errorMsg.replace(/</g, '&lt;')}</span>`;
                }
            } catch (e) {
                console.error(`Qwen network error:`, e.message);
                fullText = `<span class='text-amber-400'>Qwen Network Error: ${e.message.replace(/</g, '&lt;')}</span>`;
            }

            document.getElementById(typingId).remove();
            if (success && fullText) {
                agentHistory.push({ role: 'user', content: msg });
                agentHistory.push({ role: 'assistant', content: fullText.trim() });
                appendAgentMsg('ai', fullText.trim(), modelId);
            } else {
                appendAgentMsg('ai', fullText, modelId); // fullText already contains error message
            }
            return;
        }
        
        if (modelId === 'gemini') {
            let geminiKeys = [];
            const localKey = localStorage.getItem('STUDYCODE_GEMINI_KEY');
            if (localKey) {
                geminiKeys.push(localKey);
            } else {
                const userKey = prompt("Please enter your Gemini API Key to use this model:");
                if (userKey) {
                    localStorage.setItem('STUDYCODE_GEMINI_KEY', userKey.trim());
                    geminiKeys.push(userKey.trim());
                } else {
                    appendAgentMsg('ai', "<span class='text-red-400'>API Key required for Gemini. Please provide one.</span>", modelId);
                    document.getElementById(typingId)?.remove();
                    return;
                }
            }
            
            const systemPrefix = sysPrompt + "\n\nIdentity Role: You are simulating " + modelId + ".\n\n";
            let historyStr = agentHistory.map(m => m.role.toUpperCase() + ": " + m.content).join("\n\n");
            const fullPromptGemini = systemPrefix + (historyStr ? historyStr + "\n\nUSER: " + msg : "USER: " + msg);
            
            const userParts = [{ text: fullPromptGemini }];
            if (window._attachedImageBase64) {
                userParts.push({
                    inlineData: {
                        mimeType: window._attachedImageMime,
                        data: window._attachedImageBase64
                    }
                });
                window.clearAttachedImage();
            }

            const payload = {
                contents: [{ parts: userParts }]
            };
            
            let lastError = "All keys exhausted";
            
            for (const key of geminiKeys) {
                try {
                    // Try Gemini 2.5 Flash
                    let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    let data = await res.json();
                    
                    // Fallback to latest stable 1.5 flash format if 2.5 fails
                    if (!res.ok || (data && data.error && data.error.code === 429)) {
                        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        data = await res.json();
                    }
                    
                    if (res.ok && data.candidates && data.candidates[0].content) {
                        fullText = data.candidates[0].content.parts[0].text;
                        success = true;
                        break;
                    } else {
                        lastError = data?.error?.message || `API Error HTTP ${res.status}`;
                        console.warn(`Key ...${key.slice(-4)} failed:`, lastError);
                    }
                } catch(e) {
                    lastError = e.message;
                    console.warn(`Key ...${key.slice(-4)} network error:`, e.message);
                }
            }
            
            document.getElementById(typingId).remove();
            if (success && fullText) {
                agentHistory.push({ role: 'user', content: msg });
                agentHistory.push({ role: 'assistant', content: fullText.trim() });
                appendAgentMsg('ai', fullText.trim(), modelId);
            } else {
                appendAgentMsg('ai', "<span class='text-amber-400'>API Error: " + lastError.replace(/</g, '&lt;') + "</span>", modelId);
            }
            return;
        }

        if (modelId === 'deepseek' || modelId === 'kimi') {
            let invokeUrl = "/.netlify/functions/nvidia";
            if (window.location.protocol === 'file:') {
                invokeUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://integrate.api.nvidia.com/v1/chat/completions");
            }
            
            let nvKey = localStorage.getItem('STUDYCODE_NVIDIA_KEY');
            if (window.location.protocol === 'file:' && !nvKey) {
                nvKey = prompt("Please enter your NVIDIA API Key for DeepSeek/Kimi:");
                if (nvKey) localStorage.setItem('STUDYCODE_NVIDIA_KEY', nvKey.trim());
                else {
                    appendAgentMsg('ai', "<span class='text-red-400'>NVIDIA API Key required for local execution.</span>", modelId);
                    document.getElementById(typingId)?.remove();
                    return;
                }
            } else if (window.location.protocol !== 'file:' && !nvKey) {
                nvKey = "NVIDIA_API_KEY_HIDDEN_2"; // Proxy handles it
            }

            const config = {
                deepseek: {
                    model: "deepseek-ai/deepseek-r1-distill-llama-8b",
                    key: nvKey
                },
                kimi: {
                    model: "moonshotai/kimi-k2-instruct",
                    key: nvKey
                }
            }[modelId];

            try {
                const messages = [
                    { role: "system", content: sysPrompt },
                    ...agentHistory.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
                    { role: "user", content: msg }
                ];

                const res = await fetch(invokeUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${config.key}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: messages,
                        temperature: 0.6,
                        top_p: 0.7,
                        max_tokens: 4096,
                        stream: false
                    })
                });

                const data = await res.json();
                if (res.ok && data.choices && data.choices[0].message) {
                    fullText = data.choices[0].message.content;
                    success = true;
                } else {
                    fullText = "Error: " + (data?.error?.message || "Failed to get response");
                }
            } catch (e) {
                fullText = "Network Error: " + e.message;
            }

            document.getElementById(typingId).remove();
            if (success) {
                agentHistory.push({ role: 'user', content: msg });
                agentHistory.push({ role: 'assistant', content: fullText.trim() });
                appendAgentMsg('ai', fullText.trim(), modelId);
            } else {
                appendAgentMsg('ai', "<span class='text-amber-400'>" + fullText + "</span>", modelId);
            }
            return;
        }

        const seed = Math.floor(Math.random() * 1000000);
        const reqModel = 'openai';
        
        const sysContent = sysPrompt + "\n\nIdentity Role: You are simulating " + modelId;
        const formattedHistory = agentHistory.map(m => ({ role: m.role, content: m.content }));
        const messages = [
            { role: "system", content: sysContent },
            ...formattedHistory,
            { role: "user", content: msg }
        ];

        function isOnlyNotice(txt) {
            return txt.includes('IMPORTANT NOTICE') || txt.includes('being deprecated') || txt.includes('enter.pollinations.ai');
        }

        // Layer 1: Direct POST with no-referrer
        try {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 45000);
            const resp = await fetch('https://text.pollinations.ai/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({ messages, model: reqModel, seed, stream: true }),
                signal: controller.signal
            });
            if (resp.ok && resp.body) {
                const reader = resp.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        const t = line.trim();
                        if (!t || t === 'data: [DONE]') continue;
                        if (t.startsWith('data: ')) {
                            try {
                                const c = JSON.parse(t.slice(6)).choices?.[0]?.delta?.content;
                                if (c) fullText += c;
                            } catch(e) {}
                        }
                    }
                }
                clearTimeout(tid);
                if (fullText.trim() && !isOnlyNotice(fullText)) {
                    success = true;
                } else { fullText = ''; }
            }
        } catch(e) {}

        // Layer 2: Blob Worker
        if (!success) {
            try {
                const workerCode = `
                    self.onmessage = async function(e) {
                        try {
                            const r = await fetch('https://text.pollinations.ai/', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: e.data
                            });
                            const t = await r.text();
                            self.postMessage(t);
                        } catch(err) {
                            self.postMessage('');
                        }
                    };
                `;
                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                
                fullText = await new Promise((resolve) => {
                    const worker = new Worker(workerUrl);
                    const timeout = setTimeout(() => { worker.terminate(); URL.revokeObjectURL(workerUrl); resolve(''); }, 45000);
                    worker.onmessage = (e) => {
                        clearTimeout(timeout); worker.terminate(); URL.revokeObjectURL(workerUrl);
                        resolve(e.data || '');
                    };
                    worker.postMessage(JSON.stringify({ messages, model: reqModel, seed }));
                });
                
                // Clean
                fullText = fullText.replace(/\n*---\n*\*?\*?Support.*$/s, '').replace(/\n*🌸.*$/s, '').trim();
                if (fullText && !isOnlyNotice(fullText)) {
                    success = true;
                } else { fullText = ''; }
            } catch(e) { fullText = ''; }
        }

        // Layer 3: Simple GET fallback
        if (!success) {
            try {
                const systemPrompt = sysPrompt + "\n\nIdentity Role: You are simulating " + modelId;
                const getUrl = `https://text.pollinations.ai/${encodeURIComponent(msg)}?model=${reqModel}&system=${encodeURIComponent(systemPrompt)}&seed=${seed}`;
                const r3 = await fetch(getUrl, { referrerPolicy: 'no-referrer' });
                if (r3.ok) {
                    let t3 = await r3.text();
                    if (t3.includes('IMPORTANT NOTICE')) {
                        const pts = t3.split(/work normally\.?/i);
                        if (pts.length > 1) t3 = pts[pts.length - 1];
                    }
                    fullText = t3.replace(/\n*---\n*\*?\*?Support.*$/s, '').replace(/\n*🌸.*$/s, '').trim();
                    if(fullText && !isOnlyNotice(fullText)) success = true;
                }
            } catch(e) {}
        }
        
        document.getElementById(typingId).remove();
        
        if(!success || !fullText.trim()) {
            appendAgentMsg('ai', "<span class='text-red-400'>Communication interface error: API unresponsive or blocked. Please try again or refresh the page.</span>", modelId);
        } else {
            agentHistory.push({ role: 'user', content: msg });
            agentHistory.push({ role: 'assistant', content: fullText.trim() });
            appendAgentMsg('ai', fullText.trim(), modelId);
        }
    } catch (err) {
        document.getElementById(typingId)?.remove();
        appendAgentMsg('ai', "<span class='text-red-400'>Communication interface error: " + err.message + "</span>", modelId);
    }
}
window.sendAgentMessage = sendAgentMessage;

function getModelIcon(modelId, isTyping = false) {
    let iconHtml = '<span class="material-symbols-outlined text-indigo-400 text-sm' + (isTyping ? ' animate-spin' : '') + '">robot_2</span>';
    if(modelId === 'gemini') {
        iconHtml = '<svg class="w-5 h-5 fill-current' + (isTyping ? ' animate-spin' : '') + '" style="color:#4285F4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/></svg>';
    } else if(modelId === 'gpt-4o') {
        iconHtml = '<svg class="w-5 h-5' + (isTyping ? ' animate-pulse' : '') + '" style="color:#10a37f" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4114-.6765zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0974-2.3616l2.603-1.5018 2.6032 1.5018v3.0036l-2.6032 1.5018-2.603-1.5018z" fill="currentColor"/></svg>';
    } else if(modelId === 'nexify' || modelId === 'claude-k-410a') {
        iconHtml = '<img src="nexify-logo.png" class="w-full h-full object-cover rounded-full' + (isTyping ? ' animate-pulse' : '') + '" />';
    } else if(modelId === 'deepseek') {
        iconHtml = '<img src="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/deepseek.png" class="w-full h-full object-contain' + (isTyping ? ' animate-pulse' : '') + '" />';
    } else if(modelId === 'kimi') {
        iconHtml = '<img src="https://huggingface.co/moonshotai/Kimi-K2.5/resolve/main/figures/kimi-logo.png" class="w-full h-full object-cover rounded-full' + (isTyping ? ' animate-pulse' : '') + '" />';
    }
    return iconHtml;
}

function appendAgentMsg(role, text, modelId) {
    const container = document.getElementById('agentChat');
    const div = document.createElement('div');
    if(role === 'user') {
        div.className = 'flex justify-end mt-2';
        div.innerHTML = `<div class="bg-[#242426] border border-[#2d2d2d] px-3.5 py-2.5 rounded-2xl rounded-tr-sm text-[13px] text-[#d0d0d0] max-w-[85%] leading-relaxed shadow-sm">${escapeHtml(text)}</div>`;
    } else {
        div.className = 'flex gap-3 mt-4 items-start w-full';
        let htmlOut = ""; try { htmlOut = marked.parse(text); } catch(e) { htmlOut = escapeHtml(text).replace(/\n/g, '<br>'); }
        let avatarHtml = getModelIcon(modelId || 'gpt-4o', false);
        div.innerHTML = `<div class="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center mt-1">${avatarHtml}</div><div class="bg-ide-base px-3 py-2 rounded-xl rounded-tl-sm text-[12.5px] text-slate-200 border border-ide-border w-full max-w-[calc(100%-3rem)] leading-relaxed shadow-sm overflow-x-auto markdown-prose">${htmlOut}</div>`;
    }
    container.appendChild(div);
    
    if(role === 'ai') {
        const blocks = div.querySelectorAll('pre');
        blocks.forEach(b => {
            b.style.background = '#0B0D14'; b.style.border = '1px solid #2A2F42'; b.style.borderRadius = '8px'; b.style.padding = '10px'; b.style.marginTop = '8px'; b.style.marginBottom = '8px'; b.style.fontSize = '12px';
            const codeLabel = document.createElement('div'); codeLabel.className = 'text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 select-none border-b border-[#2A2F42] pb-1';
            const copyBtn = document.createElement('button'); copyBtn.innerText = 'Apply Code'; copyBtn.className = 'float-right bg-indigo-500 hover:bg-indigo-400 text-white px-2 py-0.5 rounded shadow cursor-pointer text-[9px]';
            copyBtn.onclick = () => {
                const raw = b.querySelector('code').innerText;
                let inferredLang = b.querySelector('code').className.replace('language-','');
                if(!inferredLang && raw.includes('<html>')) inferredLang = 'html';
                if(currentMode === 'frontend') {
                    if(inferredLang === 'html') { edFeHtml.setValue(raw); switchFile('fe', 'html'); }
                    else if(inferredLang === 'css') { edFeCss.setValue(raw); switchFile('fe', 'css'); }
                    else if(['js', 'javascript'].includes(inferredLang)) { edFeJs.setValue(raw); switchFile('fe', 'js'); }
                    else { edFeHtml.setValue(raw); switchFile('fe', 'html'); } 
                } else edBackend.setValue(raw);
                compileCode(); copyBtn.innerText = 'Applied!'; setTimeout(()=>{ copyBtn.innerText='Apply Code'; }, 2000);
            };
            codeLabel.appendChild(copyBtn); codeLabel.appendChild(document.createTextNode('CODE FRAGMENT')); b.insertBefore(codeLabel, b.firstChild);
        });
        
        // --- ANTIGRAVITY AUTO-APPLY SYSTEM ---
        const workflowType = document.getElementById('workflowSelector') ? document.getElementById('workflowSelector').value : 'fast';
        const thinkingModels = ['gemini', 'gpt-4o', 'nexify', 'claude-k-410a', 'deepseek', 'kimi'];
        
        if (workflowType === 'thinking' && thinkingModels.includes(modelId)) {
            if (text.toLowerCase().includes("should i proceed?") || text.toLowerCase().includes("proceed with this plan?")) {
                // Plan is ready - Play Antigravity sound
                playAntigravitySound('plan');
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'flex gap-2 mt-3';
                actionsDiv.innerHTML = `
                    <button onclick="window.antigravityAction('accept')" class="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-all active:scale-95">
                        <span class="material-symbols-outlined text-[14px]">check_circle</span> ACCEPT PLAN
                    </button>
                    <button onclick="window.antigravityAction('reject')" class="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition-all active:scale-95">
                        <span class="material-symbols-outlined text-[14px]">cancel</span> REJECT
                    </button>
                `;
                div.querySelector('.bg-ide-base').appendChild(actionsDiv);
            } else if (blocks.length > 0) {
                // Implementation finished - Play implementation sound
                playAntigravitySound('implement');
                
                setTimeout(() => {
                    div.querySelectorAll('button').forEach(btn => {
                        if(btn.innerText === 'Apply Code') btn.click();
                    });
                }, 500);
            }
        }
    }
    container.scrollTop = container.scrollHeight;
}

window.antigravityAction = function(type) {
    const input = document.getElementById('agentInput');
    if (type === 'accept') {
        input.value = "Yes, please proceed with the implementation.";
        sendAgentMessage();
    } else {
        input.value = "No, I reject this plan. Let's stop here.";
        sendAgentMessage();
    }
    // Remove the buttons after choice
    const lastMsgButtons = document.querySelectorAll('#agentChat .flex.gap-2.mt-3');
    if (lastMsgButtons.length > 0) {
        lastMsgButtons[lastMsgButtons.length - 1].remove();
    }
};

const _agAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playAntigravitySound(type) {
    const ctx = _agAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    
    if (type === 'plan') {
        // Rising Sweeping Digital Notification
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain).connect(ctx.destination);
        osc.start(); osc.stop(now + 0.4);
    } else {
        // Harmonic Ascending Chime (Implement)
        [0, 0.1, 0.2].forEach((delay, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600 + (i * 200), now + delay);
            gain.gain.setValueAtTime(0.05, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + delay); osc.stop(now + delay + 0.4);
        });
    }
}

function appendTyping(id, modelId) {
    const container = document.getElementById('agentChat');
    const div = document.createElement('div'); div.id = id; div.className = 'flex gap-3 mt-4 items-start';
    let avatarHtml = getModelIcon(modelId || 'gpt-4o', true);
    div.innerHTML = `<div class="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">${avatarHtml}</div><div class="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-2 animate-pulse">Running inferences...</div>`;
    container.appendChild(div); container.scrollTop = container.scrollHeight;
}

function escapeHtml(unsafe) { return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
