const AIHub = {
    get root() {
        return state.aihubconfig;
    },
    set root(value) {
        state.aihubconfig = value;
        this.onUpdate();
    },
    onUpdate: function() {
        if (this.onSubUpdate) { 
            this.onSubUpdate(); 
        }
    },
    get config() {
        return this.root.config;
    },
    set config(value) {
        this.root.config = value;
        this.onUpdate();
    },
    get configs() {
        return this.root.configs;
    },
    set configs(value) {
        this.root.configs = value;
        this.onUpdate();
    },
    knownModels: {},
    setConfig: function(root) {
        this.root = root || {
            config: {},
            configs: {}
        }
    },
    serialize: function() {
        return JSON.stringify(this.root);
    },
    deserialize: function(data) {
        this.root = JSON.parse(data);
        this.setConfig(this.root);
        this.onUpdate();
    },
    setOnUpdate: function(callback) {
        this.onSubUpdate = callback;
    },
    drawButton: function(element, key) {
        // if element tag is already button
        if (element.tagName === 'BUTTON') {
            element.addEventListener('click', () => {
                this.showConfigModal(key);
            })
            element.textContent = '编辑 AI 配置';
            return;
        }

        const button = document.createElement('button');
        button.textContent = '编辑 AI 配置';
        button.addEventListener('click', () => {
            this.showConfigModal(key);
        });
        element.appendChild(button);
    },
    showConfigModal: function(key) {
        const modalHtml = `
            <div data-id="aiConfigModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 100000;
            ">
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow-y: auto;
                ">
                    <h3 style="margin-bottom: 10px;">AI 配置 (Key: ${key})</h3>
                    <div data-id="configAssociation">
                        <label style="display: block; margin-bottom: 5px;">关联配置:</label>
                        <select data-id="configNameSelect" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            <option value="">-- 请选择 --</option>
                        </select>
                    </div>
                    <div data-id="configList"></div>
                    <button data-id="addConfigButton" style="margin-top: 10px;">添加配置</button>
                    <button data-id="OK" style="margin-top: 10px;">关闭窗口</button>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        const configAssociation = modalContainer.querySelector('[data-id="configAssociation"]');
        const configNameSelect = modalContainer.querySelector('[data-id="configNameSelect"]');
        const configList = modalContainer.querySelector('[data-id="configList"]');
        const addConfigButton = modalContainer.querySelector('[data-id="addConfigButton"]');
        const closeButton = modalContainer.querySelector('[data-id="OK"]');

        // 填充配置名称选择框
        this.populateConfigNameSelect(configNameSelect);

        // 设置默认选中项
        if (this.config[key] && this.config[key].name) {
            configNameSelect.value = this.config[key].name;
        }

        // 配置名称选择框事件
        configNameSelect.addEventListener('change', () => {
            const configName = configNameSelect.value;
            this.config[key] = { name: configName }; // 保存关联配置
            if (this.onUpdate) this.onUpdate();
        });

        // 关闭弹窗
        const closeModal = () => {
            document.body.removeChild(modalContainer);
        };
        closeButton.addEventListener('click', closeModal);

        // 渲染配置列表
        this.renderConfigList(configList, configNameSelect);

        // 添加配置按钮事件
        addConfigButton.addEventListener('click', async () => {
            await this.showConfigEditModal(configList);
            this.populateConfigNameSelect(configNameSelect);
            if (this.config[key] && this.config[key].name) {
                configNameSelect.value = this.config[key].name;
            }
            this.renderConfigList(element); // 重新渲染列表
        });

        // ESC键关闭功能
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                closeModal()
                document.removeEventListener('keydown', escListener);
            }
        });

        // 移除弹窗
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                closeModal()
            }
        });
    },
    populateConfigNameSelect: function(selectElement, key) {
        const previousValue = selectElement.value;
        // 清空选择框
        selectElement.innerHTML = '<option value="">-- 请选择 --</option>';

        // 填充配置名称
        Object.keys(this.configs).forEach(configName => {
            const option = document.createElement('option');
            option.value = configName;
            option.textContent = this.configs[configName].name + " (" + this.configs[configName].model + ")";
            selectElement.appendChild(option);
        });

        if (previousValue) {
            selectElement.value = previousValue;
        }

    },
    renderConfigList: function(element, configNameSelect) {
        element.innerHTML = ''; // 清空列表

        Object.keys(this.configs).forEach((configName, index) => {
            const config = this.configs[configName]
            const configItem = document.createElement('div');
            configItem.style.cssText = `
                border: 1px solid #ccc;
                padding: 10px;
                margin-bottom: 10px;
                border-radius: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            configItem.innerHTML = `
                <span title="${config.uuid}">${config.name} - ${config.model}</span>
                <div>
                    <button data-uuid="${configName}" data-action="edit" style="margin-right: 5px;">编辑</button>
                    <button data-uuid="${configName}" data-action="delete">删除</button>
                    <button data-uuid="${configName}" data-action="copy">复制</button>
                </div>
            `;
            element.appendChild(configItem);

            // 编辑和删除按钮事件
            configItem.querySelector('[data-action="edit"]').addEventListener('click', async (e) => {
                await this.showConfigEditModal(element, config);
                if (this.onUpdate) this.onUpdate();
                this.renderConfigList(element, configNameSelect); // 重新渲染列表
                this.populateConfigNameSelect(configNameSelect);
                
            });
            configItem.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
                if (confirm('确定要删除这个配置吗？')) {
                    delete this.configs[config.uuid];
                    if (this.onUpdate) this.onUpdate();
                    this.renderConfigList(element, configNameSelect); // 重新渲染列表
                    this.populateConfigNameSelect(configNameSelect);
                    
                }
            });
            configItem.querySelector('[data-action="copy"]').addEventListener('click', (e) => {
                if (confirm('确定要复制这个配置吗？')) {
                    const uuid = crypto.randomUUID();
                    this.configs[uuid] = JSON.parse(JSON.stringify(config));
                    this.configs[uuid].uuid = uuid;
                    this.configs[uuid].name += "_copy";
                    if (this.onUpdate) this.onUpdate();
                    this.renderConfigList(element, configNameSelect); // 重新渲染列表
                    this.populateConfigNameSelect(configNameSelect);
                    
                }
            })
        });
    },
   showConfigEditModal: async function(configList, config = null) {
        return new Promise((resolve, reject) => {
            const isEdit = config !== null;
            const uuid = config == null ? crypto.randomUUID() : (config.uuid || crypto.randomUUID());
            const modalHtml = `
                <div data-id="configEditModal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100000;
                ">
                    <div style="
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        width: 90%;
                        max-width: 600px;
                        max-height: 90vh;
                        overflow-y: auto;
                    ">
                        <h3 style="margin-bottom: 10px;">${isEdit ? '编辑' : '添加'} AI 配置</h3>
                        <form data-id="configForm">
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px;">名称:</label>
                                <input type="text" data-name="name" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" required>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px;">URI:</label>
                                <input type="text" data-name="uri" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" required>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px;">密钥:</label>
                                <div style="display: flex; align-items: center;">
                                    <button type="button" data-id="selectKeyButton" style="
                                        width: 80%;
                                        padding: 8px;
                                        border: 1px solid #ccc;
                                        border-radius: 4px;
                                        text-align: left;
                                        background-color: white;
                                        overflow: hidden;
                                        text-overflow: ellipsis;
                                        white-space: nowrap;
                                    ">密钥: ${config ? config.password : '请选择'}</button>
                                    <button type="button" data-id="removeKeyButton" style="
                                        width: 18%;
                                        padding: 8px;
                                        margin-left: 5px;
                                        background-color: #f44336;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 12px;
                                    ">删除</button>
                                </div>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px;">模型:</label>
                                <button type="button" data-id="selectModelButton" style="
                                    width: 80%;
                                    padding: 8px;
                                    border: 1px solid #ccc;
                                    border-radius: 4px;
                                    text-align: left;
                                    background-color: white;
                                ">模型: ${config ? config.model : '请选择'}</button>
                                <button type="button" data-id="removeModelButton" style="
                                    width: 18%;
                                    padding: 8px;
                                    margin-left: 5px;
                                    background-color: #f44336;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">删除</button>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px;">模型:</label>
                                <input placeholder="如果上面那个不能用..." type="text" data-name="model-backup" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; margin-bottom: 5px;">流式传输:</label>
                                <select data-name="stream" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                                    <option value="true">是</option>
                                    <option value="false">否</option>
                                </select>
                            </div>
                            <div data-id="extraParams">
                                <label style="display: block; margin-bottom: 5px;">其他参数:</label>
                                <!-- 这里动态添加参数 -->
                            </div>
                            <button type="button" data-id="addParamButton" style="margin-bottom: 10px;">添加参数</button>
                            <div>
                                <button type="button" data-id="saveButton">保存</button>
                                <button type="button" data-id="cancelButton">取消</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);

            const form = modalContainer.querySelector('[data-id="configForm"]');
            const extraParams = modalContainer.querySelector('[data-id="extraParams"]');
            const addParamButton = modalContainer.querySelector('[data-id="addParamButton"]');
            const cancelButton = modalContainer.querySelector('[data-id="cancelButton"]');
            const uriInput = form.querySelector('[data-name="uri"]');
            const selectModelButton = modalContainer.querySelector('[data-id="selectModelButton"]');
            const selectKeyButton = modalContainer.querySelector('[data-id="selectKeyButton"]');
            const removeKeyButton = modalContainer.querySelector('[data-id="removeKeyButton"]');
            const removeModelButton = modalContainer.querySelector('[data-id="removeModelButton"]');
            const saveButton = modalContainer.querySelector('[data-id="saveButton"]');
            // 填充表单
            if (config) {
                form.querySelector('[data-name="name"]').value = config.name;
                form.querySelector('[data-name="uri"]').value = config.uri;
                selectKeyButton.textContent = `密钥: ${config.password || '请选择'}`;
                selectKeyButton.dataset.key = config.password || '';
                selectModelButton.textContent = `模型: ${config.model || '请选择'}`;
                selectModelButton.dataset.model = config.model || '';
                form.querySelector('[data-name="model-backup"]').value = config.model || '';
                form.querySelector('[data-name="stream"]').value = config.stream ? 'true' : 'false';

                // 填充额外参数
                if (config.parameters) {
                    config.parameters.forEach(param => {
                        this.addExtraParam(extraParams, param.name, JSON.stringify(param.value));
                    });
                }
            }

            // URI 改变事件
            uriInput.addEventListener('change', async () => {
                const uri = uriInput.value;
            });

            // 选择模型按钮事件
            selectModelButton.addEventListener('click', async () => {
                const uri = uriInput.value;
                if (uri === 'manual' || uri.length === 0) {
                    alert('请先输入有效的 URI');
                    return;
                }

                try {
                    const models = await this.fetchModelsFromURI(uri, selectKeyButton.dataset.key);
                    const modelList = models;
                    const selectedModel = await generalSelect(modelList, "请选择模型", null, selectModelButton.dataset.model || null);
                    selectModelButton.textContent = `模型: ${selectedModel}`;
                    selectModelButton.dataset.model = selectedModel
                } catch (error) {
                    console.error('获取模型列表失败:', error);
                    alert('获取模型列表失败，请手动输入模型名称');
                }
            });
            //选择key按钮
            selectKeyButton.addEventListener('click', async () => {
                try {
                    const keyId = await KeyHub.showKeyManager();
                    selectKeyButton.textContent = `密钥: ${keyId}`;
                    selectKeyButton.dataset.key = keyId;
                } catch (error) {
                    console.log("取消选择 Key");
                }
            });
            //删除 key 按钮
            removeKeyButton.addEventListener('click', async () => {
                selectKeyButton.textContent = `密钥: 请选择`;
                selectKeyButton.dataset.key = '';
            });
            removeModelButton.addEventListener('click', async () => {
                selectModelButton.textContent = `模型: 请选择`;
                selectModelButton.dataset.model = '';
            })

            // 添加参数按钮事件
            addParamButton.addEventListener('click', () => {
                this.addExtraParam(extraParams);
            });

            // 取消按钮事件
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(modalContainer);
                resolve();
            });

            saveButton.addEventListener('click', () => {
                const name = form.querySelector('[data-name="name"]').value;
                const uri = form.querySelector('[data-name="uri"]').value;
                const password = selectKeyButton.dataset.key || '';
                const model = selectModelButton.dataset.model || form.querySelector('[data-name="model-backup"]').value || '';
                const stream = form.querySelector('[data-name="stream"]').value === 'true';

                const parameters = [];
                extraParams.querySelectorAll('[data-param]').forEach(paramDiv => {
                    const paramName = paramDiv.querySelector('[data-name="paramName"]').value;
                    const paramValue = paramDiv.querySelector('[data-name="paramValue"]').value;
                    if (paramName && paramValue) {
                        try {
                            parameters.push({
                                name: paramName,
                                value: JSON.parse(paramValue)
                            });
                        } catch (e) {
                            alert('JSON Error:' + paramValue);
                            throw e;
                        }
                    }
                });

                const newConfig = {
                    name: name,
                    uri: uri,
                    password: password,
                    model: model,
                    stream: stream,
                    parameters: parameters,
                    uuid: uuid,
                };

                if (isEdit) {
                    Object.assign(config, newConfig);
                } else {
                    this.configs[uuid] = newConfig;
                }

                this.renderConfigList(configList); // 重新渲染列表
                document.body.removeChild(modalContainer);
                if (this.onUpdate) this.onUpdate();
                resolve();
                
            });

                    // ESC键关闭功能
                    modalContainer.addEventListener('keydown', function escListener(e) {
                        if (e.key === 'Escape') {
                            document.body.removeChild(modalContainer);
                            document.removeEventListener('keydown', escListener);
                            resolve();
                        }
                    });
            
                    // 移除弹窗
                    
                    modalContainer.addEventListener('click', (e) => {
                        if (e.target === modalContainer) {
                            document.body.removeChild(modalContainer);
                        }
                    });
        });
    },
    addExtraParam: function(element, name = '', value = '') {
        const paramDiv = document.createElement('div');
        paramDiv.dataset.param = 'true';
        paramDiv.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 5px;
        `;
        paramDiv.innerHTML = `
            <input type="text" data-name="paramName" placeholder="参数名" value="${name}" style="width: 40%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <input type="text" data-name="paramValue" placeholder="参数值" value="${value}" style="width: 40%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <button type="button" data-action="removeParam">移除</button>
        `;
        element.appendChild(paramDiv);

        // 移除参数按钮事件
        paramDiv.querySelector('[data-action="removeParam"]').addEventListener('click', () => {
            element.removeChild(paramDiv);
        });
    },
    fetchModelsFromURI: async function(uri, key) {
        if (this.knownModels[uri]) {
            return this.knownModels[uri]
        }
        const apiEndpoint1 = (uri in knownURI ? knownURI[uri] : uri);
        const apiEndpoint = (apiEndpoint1 + '/models').replace(/(?<!:)\/\/+/g, '/');
        try {
            
            const response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: KeyHub.getHeader({
                    'Content-Type': 'application/json',
                }, key)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const models = data.data.map(model => model.owned_by === 'google' ? {id: model.id.replace('models/', '')} : {id: model.id, text: model.name});
            this.knownModels[uri] = models
            return models;
        } catch (error) {
            console.error('获取模型列表失败:', error);
            throw error;
        }
    },
    getConfig: function(key) {
        const configName = this.config[key]?.name
        if (!configName) {
            console.warn(`AIHub: No configs found for key "${key}"`);
            return null;
        }

        const config = this.configs[configName];

        if (!config) {
            console.warn(`AIHub: No config found with name "${configName}"`);
            return null;
        }

        return config;
    },
    callAPI: async function(key, messages, callbacks = {}) {
        const config = this.getConfig(key);

        if (!config) {
            const error = new Error(`No AI config found for key "${key}"`);
            if (callbacks.onError) callbacks.onError(error);
            throw error;
        }

        const {
            stream = true,
            onToken = null,
            onComplete = null,
            onError = null,
            onReason = null,
            onSetup = null,
        } = callbacks;

        if (config.uri === 'main') {
            return await callAPI(messages, {
                stream,
                onToken,
                onComplete,
                onError,
                onReason,
                onSetup,
            }) // use main api
        }

        try {
            const requestBody = {
                model: config.model,
                messages: messages.map(msg => (msg.name + msg.content ? ({
                    role: msg.role,
                    content: msg.name ? msg.name + ": " + msg.content : msg.content,
                }) : null)),
                stream: config.stream
            };
            requestBody.messages = requestBody.messages.filter(msg => msg);

            // 添加额外参数
            if (config.parameters) {
                config.parameters.forEach(param => {
                    requestBody[param.name] = param.value;
                });
            }

            // 在callAPI函数中的manual模式部分修改为：
            if (config.uri === 'manual') {
                const requestBody = {
                    model: config.model,
                    messages: messages.map(msg => (msg.name + msg.content ? ({
                        role: msg.role,
                        content: msg.name ? msg.name + ": " + msg.content : msg.content,
                        name: msg.name,
                        compressed: msg.compressed,
                    }) : null)),
                    stream: config.stream
                };
                const manualResponse = await showManualInputDialog(
                    messages, // 传入完整的messages数组
                    requestBody
                );

                if (!manualResponse) {
                    throw new Error('Manual input cancelled');
                }

                if (config.stream) {
                    // treat all as a token because we are in manual mode
                    if (onToken) onToken(manualResponse, manualResponse);
                    if (onComplete) onComplete(manualResponse);
                    return manualResponse;
                } else {
                    if (onComplete) onComplete(manualResponse);
                    return manualResponse;
                }
            }


            // 如果是openrouter，使用完整API endpoint
            /*
            const apiEndpoint = state.endpoint === 'openrouter' 
                ? 'https://openrouter.ai/api/v1/chat/completions'
                : state.endpoint + '/v1/chat/completions';
            */
            const apiEndpoint1 = (config.uri in knownURI ? knownURI[config.uri] : config.uri);
            const apiEndpoint2 = apiEndpoint1;
            const apiEndpoint = (apiEndpoint2 + '/chat/completions').replace(/(?<!:)\/\/+/g, '/');
            const password = KeyHub.getKey(config.password);
            const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${password}`,
                    'X-Title': 'UYP App',
                    'HTTP-Referer': 'https://localhost:8010',
            };
            if (password == null) {
                delete headers['Authorization'];
            }
            const abortHandler = new AbortController();
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: abortHandler.signal,
            });
            if (onSetup) {
                onSetup(abortHandler);
            }
            

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            if (config.stream) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullContent = '';
                let fullReason = '';

                while (true) {
                    const {
                        value,
                        done
                    } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, {
                        stream: true
                    });

                    while (true) {
                        const newlineIndex = buffer.indexOf('\n');
                        if (newlineIndex === -1) break;

                        const line = buffer.slice(0, newlineIndex);
                        buffer = buffer.slice(newlineIndex + 1);

                        if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            try {
                                const json = JSON.parse(jsonStr);
                                if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                                    const token = json.choices[0].delta.content;
                                    fullContent += token;
                                    if (onToken) onToken(token, fullContent);
                                }
                               if (json.choices && json.choices[0].delta && (json.choices[0].delta.reasoning_content || json.choices[0].delta.reasoning)) {
                                    const token = json.choices[0].delta.reasoning_content || json.choices[0].delta.reasoning;
                                    fullReason += token;
                                    if (onReason) {
                                        onReason(token, fullReason);
                                    } else {
                                        if (onToken) onToken(token, 
                                        '<think>' + fullReason + '</think>' + fullContent);
                                    }
                                }
                            } catch (e) {
                                console.warn('Failed to parse JSON:', jsonStr);
                                console.error(e);
                            }
                        }
                    }
                }

                if (onComplete) onComplete(fullContent);
                return fullContent;
            } else {
                const json = await response.json();
                const content = json.choices[0].message.content;
                if (onComplete) onComplete(content);
                return content;
            }

        } catch (error) {
            if (onError) onError(error);
            throw error;
        }
    },
    previewStream: function(abortFunc = null, 
        displayOnData = true
    ) {
        const compressInfoDiv = document.createElement('div');
        compressInfoDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 100000;
            font-size: 16px;
            height: 60vh;
            overflow-y: scroll;
            width: 80vw;
        `;
        if (displayOnData) {
            compressInfoDiv.style.zIndex = -2;
        }
        compressInfoDiv.textContent = '';
        const inner = document.createElement('pre')
        inner.style.cssText = `
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        const closeButton = document.createElement("button")  
        closeButton.textContent = "X";
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #e74c3c; /* 鲜艳的红色 */
            border: none;
            color: white;
            font-size: 16px;
            border-radius: 4px;
            padding: 5px 10px; /* 增加内边距，让按钮更大 */
            font-weight: bold; /* 加粗文字 */
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); /* 增加阴影 */
            transition: background-color 0.2s ease; /* 添加过渡效果 */
        `;
        compressInfoDiv.appendChild(closeButton);
        let removed = false;      
        closeButton.addEventListener("click", () => {
            if (abortFunc) {
                abortFunc();
                if (!removed) {
                    compressInfoDiv.remove();
                    removed = true;
                }
            }
        });
        
        if (!abortFunc) {
            closeButton.disabled = true;
            closeButton.style.background = 'gray';
        }

        compressInfoDiv.appendChild(inner);        
        document.body.appendChild(compressInfoDiv);
        

        return {
            setAbort: function(func) {
                abortFunc = func;
                if (func) {
                    closeButton.disabled = false;
                    closeButton.style.background = 'blue';
                } else {
                    closeButton.disabled = true;
                    closeButton.style.background = 'gray';
                }
            },
            setContent: function(content) {
                inner.textContent = content;
                if (displayOnData) {
                    compressInfoDiv.style.zIndex = content ? 100000 : -2;
                }
            },
            hide: function() {
                compressInfoDiv.style.zIndex = -2;
            },
            show: function() {
                compressInfoDiv.style.zIndex = 100000;
            },
            dismiss: function() {
                if (!removed) {
                    document.body.removeChild(compressInfoDiv);
                    removed = true;    
                }
                
            }
        };
    },
    
};