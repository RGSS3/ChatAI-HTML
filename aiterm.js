const AITerm = {
    term: null,
    modal: null,
    user: 'user',
    ai: 'assistant',
    prompt: '你是一个终端AI助手',
    configName: 'terminal',
    command: '', 
    content: '',
    memoryBox: '',
    inputing: true,
    init: function () {
        this.command = '';
        this.content = '';
        this.inputing = true;
        this.memoryBox = '';
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

        const memoryArea = document.createElement('div');
        memoryArea.style.cssText = `
            background: #f0f0f0;
            padding: 10px;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            border-top: 1px solid #ccc;
        `
        const memoryInput = document.createElement('textarea');
        memoryInput.dataset.name = 'memory';
        memoryInput.style.cssText = `
            width: 100%;
            height: 100px;
            resize: none;
            border: none;
            font-family: monospace;
        `;
        memoryArea.appendChild(memoryInput);
        termContainer.appendChild(memoryArea);

        memoryArea.addEventListener('input', (e) => {
            this.memoryBox = e.target.value
        })
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

        this.term.writeln('欢迎来到 AI 终端！输入 /help 查看帮助。');
        this.term.write(`${this.user} >>> `);
        // 使用 onData 事件处理用户输入
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
                    this.term.write('\b \b'); // 移动光标，擦除字符，再次移动光标
                    this.command = this.command.slice(0, -1); // 从命令缓冲区中删除最后一个字符
                }
            } else {
                this.term.write(e); // 回显输入的字符
                this.command += e; // 将输入的字符添加到命令缓冲区
            }
        });

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
            this.modal.querySelector('[data-name=memory]').value = this.memoryBox;
            
            pageAlert(`加载成功！`);
        } catch (e) {
            pageAlert(`加载失败！${e}`);
        }
    },
    processCommand: async function(command) {
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
            this.content += ` ${this.user} >>>` + this.command + '\n' + `  ${this.ai} >>>`;
            this.command = '';
            await this.sendToAI(command);
        }
    },
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
        // 最后4096
        // const history = this.content.length > 4096 ? this.content.slice(-4096) : this.content;

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

        this.term.write(`${this.ai} >>> `);
        let fullContent = '';

        await AIHub.callAPI(this.configName, messages, {
            stream: true,
            onToken: (token) => {
                token = token.replace(/\r?\n\r?/, "\n\r").replace(/ÿ/g, "\x1b");
                this.term.write(token);
                fullContent += token;
                this.content += token;
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
    }
};