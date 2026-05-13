const fs = require('fs');
let code = fs.readFileSync('studycode.js', 'utf8');

const regex = /try\s*\{\s*const\s*response\s*=\s*await\s*fetch\([\s\S]*?\}\s*catch\s*\(\s*err\s*\)\s*\{\s*document\.getElementById\(typingId\)\?\.remove\(\);\s*appendAgentMsg\('ai',\s*"<span class='text-red-400'>Communication interface error: "\s*\+\s*err\.message\s*\+\s*"<\/span>",\s*modelId\);\s*\}/s;

const newFetchLogc = `try {
                let fullText = "";
                // 1. Blob Worker Post (bypasses CORS/Origin issues perfectly)
                const workerCode = \`
                    self.onmessage = async function(e) {
                        try {
                            const r = await fetch('https://text.pollinations.ai/', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: e.data
                            });
                            const t = await r.text();
                            self.postMessage({ success: r.ok, text: t });
                        } catch(err) {
                            self.postMessage({ success: false, text: err.toString() });
                        }
                    };
                \`;

                const blob = new Blob([workerCode], { type: 'application/javascript' });
                const workerUrl = URL.createObjectURL(blob);
                
                const workerResult = await new Promise((resolve) => {
                    const worker = new Worker(workerUrl);
                    const timeout = setTimeout(() => { worker.terminate(); URL.revokeObjectURL(workerUrl); resolve({success:false, text:'Timeout'}); }, 30000);
                    worker.onmessage = (e) => {
                        clearTimeout(timeout); worker.terminate(); URL.revokeObjectURL(workerUrl);
                        resolve(e.data);
                    };
                    worker.postMessage(JSON.stringify({
                        messages: [
                            { role: "system", content: sysPrompt + "\\n\\nIdentity Role: You are simulating " + modelId },
                            { role: "user", content: msg }
                        ],
                        model: 'openai', 
                        seed: Math.floor(Math.random()*1000000)
                    }));
                });

                document.getElementById(typingId).remove();
                
                let answer = workerResult.text || '';
                
                // Clean notice if pollinations returns it along with the answer code
                if (answer.includes('IMPORTANT NOTICE')) {
                    const parts = answer.split(/work normally\\.?/i);
                    if (parts.length > 1) answer = parts[parts.length - 1];
                }
                
                if(!workerResult.success || !answer.trim()) {
                    appendAgentMsg('ai', "<span class='text-red-400'>Communication interface error: API unresponsive or blocked by origin policies. Please try again.</span>", modelId);
                } else {
                    appendAgentMsg('ai', answer.trim(), modelId);
                }
            } catch (err) {
                document.getElementById(typingId)?.remove();
                appendAgentMsg('ai', "<span class='text-red-400'>Communication interface error: " + err.message + "</span>", modelId);
            }`;

code = code.replace(regex, newFetchLogc);
fs.writeFileSync('studycode.js', code);
