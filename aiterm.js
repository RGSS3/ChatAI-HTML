const AITerm = {
    term: null,
    modal: null,
    user: 'user',
    ai: 'assistant',
    prompt: '你是一个终端AI助手，如果存在自定义记忆和角色，按照记忆和角色来表演或者回答，否则按照默认回答来回答',
    configName: 'terminal',
    command: '',
    content: '',
    memoryBox: '',
    inputing: true,
    initHandler: false,
    init: function () {
        this.command = '';
        this.content = '';
        this.inputing = true;
        this.memoryBox = '';
        this.initHandler = false;
    },

    showTerm: function() {
        this.init();
        this.modal = document.createElement('div');
        const style = `
            .aiterm button {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            }
            .aiterm button:hover {
                background: #0056b3;
            }
            .xterm {
                font-family: consolas monospace ;
                font-size: 12px;
                padding: 10px;
                border: 1px solid #ccc;
                height: 500px;
            }

            .xterm-viewport {
                overflow-y: auto;
            }

            .xterm-screen {
                width: 100%;
                height: 100%;
            }

            .xterm-cursor {
                border-left: 1px solid #fff;
            }
        `
        const styleEl = document.createElement('style');
        styleEl.innerHTML = style;
        document.head.appendChild(styleEl);
        this.modal.classList.add('aiterm');
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: sans-serif;
        `;

        const termContainer = document.createElement('div');
        termContainer.style.cssText = `
            background: white;
            width: 80%;
            height: 80%;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            background: #f0f0f0;
            padding: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #ccc;
        `;

        const title = document.createElement('span');
        title.textContent = 'AI 终端';
        header.appendChild(title);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
        `;
        closeButton.addEventListener('click', () => this.exit());
        header.appendChild(closeButton);
        termContainer.appendChild(header);
        const terminalArea = document.createElement('div');
        termContainer.appendChild(terminalArea);
        const buttonBar = document.createElement('div');
        buttonBar.style.cssText = `
            background: #f0f0f0;
            padding: 10px;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            border-top: 1px solid #ccc;
        `
        const configBtn = document.createElement('button');
        configBtn.textContent = '配置AI';
        configBtn.addEventListener('click', () => {
            AIHub.showConfigModal(this.configName);
        });
        buttonBar.appendChild(configBtn);
        const exitButton = document.createElement('button');
        exitButton.textContent = '退出';
        exitButton.addEventListener('click', () => this.exit());
        buttonBar.appendChild(exitButton);
        termContainer.appendChild(buttonBar);

        const saveButton = document.createElement('button');
        saveButton.textContent = '保存';
        saveButton.addEventListener('click', () => this.save());
        buttonBar.appendChild(saveButton);

        const loadButton = document.createElement('button');
        loadButton.textContent = '加载';
        loadButton.addEventListener('click', () => this.load());
        buttonBar.appendChild(loadButton);

        const editMemoryButton = document.createElement('button');
        editMemoryButton.textContent = '编辑记忆';
        editMemoryButton.addEventListener('click', async () => {
            let memoryForEdit = this.memoryBox.replace(/\x1b/g, 'ÿ'); // 替换转义字符
            const newMemory = await pagePrompt('编辑记忆', memoryForEdit, {
                width: '80%',
                maxHeight: '60vh'
            });
            if (newMemory !== null) {
                this.memoryBox = newMemory.replace(/ÿ/g, '\x1b'); // 替换回转义字符
                this.resetTerminal(); // 更新记忆后重置终端
            }
        });
        buttonBar.appendChild(editMemoryButton);

        const editContentButton = document.createElement('button');
        editContentButton.textContent = '编辑内容';
        editContentButton.addEventListener('click', async () => {
            let contentForEdit = this.content.replace(/\x1b/g, 'ÿ'); // 替换转义字符
            const newContent = await pagePrompt('编辑内容', contentForEdit, {
                width: '80%',
                maxHeight: '60vh'
            });
            if (newContent !== null) {
                this.content = newContent.replace(/ÿ/g, '\x1b'); // 替换回转义字符
                this.resetTerminal();
            }
        });
        buttonBar.appendChild(editContentButton);


        this.modal.appendChild(termContainer);
        document.body.appendChild(this.modal);

        this.term = new Terminal({
            convertEol: true,
            cursorBlink: true,
        });
        const fitAddon = new FitAddon.FitAddon();

        this.term.loadAddon(fitAddon);
        this.term.open(terminalArea);
        fitAddon.fit();
        this.term.focus();

        this.resetTerminal();

        window.addEventListener('resize', () => fitAddon.fit());
    },
    exit: function() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
            this.term.dispose();
            this.term = null;
        }
    },
    save: async function() {
        try {
            const fs = await FileSystem.create({'model': 'file'})
            const name = `${this.user}-${this.ai}.txt`;
            fs.write_object(name, {
                user: this.user,
                ai: this.ai,
                prompt: this.prompt,
                content: this.content,
                memoryBox: this.memoryBox,
            })
            pageAlert(`保存成功！`);
        } catch (e) {
            pageAlert(`保存失败！${e}`);
        }
    },
    load: async function() {
        try {
            const fs = await FileSystem.create({'model': 'file'})
            const content = await (await fs.read_content('config.txt')).json();
            this.user = content.user || 'user';
            this.ai = content.ai || 'assistant';
            this.prompt = content.prompt || '请输入您的指令：';
            this.content = content.content || '';
            this.memoryBox = content.memoryBox || '';
            this.resetTerminal();
            pageAlert(`加载成功！`);
        } catch (e) {
            pageAlert(`加载失败！${e}`);
        }
    },
    processCommand: processCommand,
    showHelp: function() {
        this.term.writeln('可用命令：');
        this.term.writeln('/help - 显示帮助');
        this.term.writeln('/exit - 退出终端');
        this.term.writeln('/setuser <用户名> - 设置用户名');
        this.term.writeln('/setAI <AI名> - 设置AI名称');
        this.term.writeln('/setprompt <提示语> - 设置提示语');
    },
    setUser: function(name) {
        this.user = name || 'user';
        this.term.writeln(`用户名已设置为 ${this.user}`);
    },
    setAI: function(name) {
        this.ai = name || 'assistant';
        this.term.writeln(`AI名称已设置为 ${this.ai}`);
    },
    setPrompt: function(prompt) {
        this.prompt = prompt || '你是一个终端AI助手';
        this.term.writeln(`提示语已设置为 ${this.prompt}`);
    },
    sendToAI: async function(message) {
        const prompt = `[xterm.js文本框所有消息]
        ${this.history || ''}
        `;

        const messages = [{
            role: 'system',
            content: `这是一个类似终端环境，不要用markdown写回复, 但你可以用转义字符(escape char)输出颜色
            这里需要输出\\e的地方，输出一个ÿ
            例如ÿ[32mhello worldÿ[0m

            自定义设定：${this.prompt} 自定义设定结束

            ${this.memoryBox ? `自定义记忆：\n${this.memoryBox}\n自定义记忆结束` : ''}

            如果以上设定是一个人物 那就进行角色扮演 沉浸式 不要专业性 而更突出人物张力和情感和角色设定 此时 硬核情节软写 软核情节直接写
            (包括：如果记忆盒内是一个Character.ai人物卡，则按照人物卡进行角色扮演)
            如果以上设定是一个工具 才保持专业性

            `
        }, {
            role: 'user',
            content: prompt + message
        }, {
            role: 'assistant',
            content: `${this.ai} >>>`
        }];
        this.content += `${this.user} >>> ${message} \n\n` + `${this.ai} >>>\n\n`;

        this.term.write(`${this.ai} >>> `);
        let fullContent = '';

        await AIHub.callAPI(this.configName, messages, {
            stream: true,
            onToken: (token) => {
                this.content += token;
                token = token.replace(/\r?\n\r?/, "\n\r").replace(/ÿ/g, "\x1b");
                this.term.write(token);
                fullContent += token;
            },
            onComplete: () => {
                this.term.writeln('');
                this.inputing = true;
            },
            onError: (err) => {
                this.term.write(`\rError: ${err.message}\n\r`);
                this.inputing = true;
            }
        });
    },
    resetTerminal: function() {
        if (!this.term) return;

        this.term.clear();
        this.term.writeln('欢迎来到 AI 终端！输入 /help 查看帮助。');
        // 打印历史消息
        this.term.writeln(this.content);
        this.term.write(`${this.user} >>> `);
        this.command = '';

        if (this.initHandler) {
            return;
        }
        this.initHandler = true;
        this.term.onData(async (e) => {
            if (!this.inputing) {
                return
            }
            if (e === '\r') { // Enter 键
                if (this.command.startsWith('  ') && !this.command.endsWith('\n\n')) {
                    // 两个空格开头，但不是以两个回车结尾，只换行
                    this.term.writeln('');
                    this.command += '\n';
                } else {
                    // 其他情况，发送命令并重置
                    this.term.writeln('');
                    await this.processCommand(this.command.trim());
                    this.command = ''; // 重置命令缓冲区
                    this.term.write(`${this.user} >>> `);
                }
            } else if (e === '\x7F') { // Backspace 键
                if (this.command.length > 0) {
                    // if this.command last is >255, 
                    if (this.command.charCodeAt(this.command.length - 1) > 255) {
                        this.term.write('\b \b\b \b'); // 移动光标，擦除字符，再次移动光标
                        this.command = this.command.slice(0, -1);
                    } else {
                        this.term.write('\b \b'); // 移动光标，擦除字符，再次移动光标
                        this.command = this.command.slice(0, -1); // 从命令缓冲区中删除最后一个字符
                    }
                }
            } else {
                this.term.write(e); // 回显输入的字符
                this.command += e; // 将输入的字符添加到命令缓冲区
            }
        });
    }
};

async function processCommand(command) {
    if (command.startsWith('/help')) {
        this.showHelp();
    } else if (command.startsWith('/exit')) {
        this.exit();
    } else if (command.startsWith('/setuser')) {
        this.setUser(command.substring(9).trim());
    } else if (command.startsWith('/setAI')) {
        this.setAI(command.substring(7).trim());
    } else if (command.startsWith('/setprompt')) {
        this.setPrompt(command.substring(11).trim());
    } else if (command.startsWith('!python')) {
        this.content += `${this.user} >>> ${command} \n\n`;
        // 查找最后一块 ```python ... ```
        let initialCode = '';
        const pythonBlockRegex = /```python\s*([\s\S]*?)\s*```/g;
        let match;
        let lastMatch = null;

        while ((match = pythonBlockRegex.exec(this.content)) !== null) {
            lastMatch = match;
        }

        if (lastMatch && lastMatch[1]) {
            initialCode = lastMatch[1].trim();
        }

        const code = await pagePrompt('输入 Python 代码', initialCode, {
            width: '80%',
            maxHeight: '60vh'
        });

        if (code) {
            this.inputing = false;
            let ccode = code.replace(/\r/g, '')
            try {
                await executePythonCode(ccode, this.term, this);
            } catch (error) {
                this.term.write(`\rError: ${error.message}\n\r`);
            } finally {
                this.inputing = true;
            }
        } else {
            
        }
    } else {
        if (command.startsWith("@")) {
            // 设置第一个空格之前 @之后的内容为AI名称
            const index = command.indexOf(' ');
            if (index !== -1) {
                this.ai = command.substring(1, index).trim();
                this.command = command.substring(index + 1).trim();
            }
        }
        this.inputing = false;
        this.history = this.content.length > 4096 ? this.content.slice(-4096) : this.content;
        this.command = '';
        await this.sendToAI(command);
    }
}
async function executePythonCode(code, term, content) {
    return new Promise(async (resolve, reject) => {
        term.write('\r开始执行 Python 代码...\n\r');
        content.content += '\r开始执行 Python 代码...\n\r';

        try {
            // 生成 UUID
            const uuid = crypto.randomUUID();
            const filename = `${uuid}.py`;

            // 1. POST writefile {uuid}.py 内容
            const writeResponse = await fetch('/chatapi/writefile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: filename,
                    content: code
                })
            });

            if (!writeResponse.ok) {
                throw new Error(`写入文件失败：${writeResponse.statusText}`);
            }

            // 2. POST execute python {uuid}.py stream=true
            const executeResponse = await fetch('/chatapi/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cmd: 'python',
                    args: ['run/' + filename],
                    stream: true
                })
            });

            if (!executeResponse.ok) {
                throw new Error(`执行命令失败：${executeResponse.statusText}`);
            }

            // 3. 流式把结果写出来
            const reader = executeResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const processStream = async () => {
                while (true) {
                    const {
                        value,
                        done
                    } = await reader.read();

                    if (done) {
                        break;
                    }

                    buffer = decoder.decode(value, {
                        stream: true
                    });

                    const lines = buffer.split("\n").filter((line) => line.trim() !== "");

                    for (const line of lines) {
                        const message = line.replace(/^data: /, "");

                        if (message === "[DONE]") {
                            term.writeln('\r\n[DONE]');
                            resolve();
                            return;
                        } else {
                            try {
                                const data = JSON.parse(message);
                                let stdout = "";
                                let stderr = "";
                                if (data.delta && data.delta.stdout !== undefined) {
                                    stdout = data.delta.stdout
                                }
                                if (data.delta && data.delta.stderr !== undefined) {
                                    stderr = data.delta.stderr
                                }
                                term.write(stdout.replace(/\r?\n\r?/, "\n\r").replace(/ÿ/g, "\x1b"));
                                term.write(stderr.replace(/\r?\n\r?/, "\n\r").replace(/ÿ/g, "\x1b"));
                                content.content += stdout;
                                content.content += stderr;

                                if (data.status !== undefined) {
                                    term.write(`\rExit Code: ${data.status}`);
                                    content.content += `\rExit Code: ${data.status}`;
                                }
                                if (data.error) {
                                    const error = data.error.replace(/\r?\n\r?/, "\n\r").replace(/ÿ/g, "\x1b");
                                    term.write(`\rError: ${error}`);
                                    content.content += `\rError: ${error}`;
                                }

                            } catch (e) {
                                console.warn('Failed to parse JSON:', message, e);
                            }
                        }
                    }
                }
                term.writeln('\r\n[DONE]');
                resolve();
            };

            term.write(`\r`);
            await processStream();

        } catch (error) {
            term.write(`\rError: ${error.message}\n\r`);
            reject(error);
        }
    });
}