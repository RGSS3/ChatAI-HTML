const knownURI = {
    'openrouter': 'https://openrouter.ai/api',
    'aliyun': 'https://dashscope.aliyuncs.com/compatible-mode'
}

window.translate_known = function(name) {
    return knownURI[name] || name
}

async function callAPI(messages, options = {}) {
    const {
        stream = true,
        onToken = null,
        onComplete = null,
        onError = null,
        onReason = null,
    } = options;

    try {
        const requestBody = {
            model: state.model,
            messages: messages.map(msg => (msg.name + msg.content ? ({
                role: msg.role,
                content: msg.name ? msg.name + ": " + msg.content : msg.content,
            }) : null)),
            stream
        };
        requestBody.messages = requestBody.messages.filter(msg => msg);

        state.parameters.forEach(param => {
            requestBody[param.name] = JSON.parse(param.value);
        });

        // 在callAPI函数中的manual模式部分修改为：
        if (state.endpoint === 'manual') {
            const requestBody = {
                model: state.model,
                messages: messages.map(msg => (msg.name + msg.content ? ({
                    role: msg.role,
                    content: msg.name ? msg.name + ": " + msg.content : msg.content,
                    name: msg.name,
                    compressed: msg.compressed,
                }) : null)),
                stream
            };
            const manualResponse = await showManualInputDialog(
                messages, // 传入完整的messages数组
                requestBody
            );
            
            if (!manualResponse) {
                throw new Error('Manual input cancelled');
            }
    
            if (stream) {
                /*
                const chars = manualResponse.split('');
                let fullContent = '';
                for (const char of chars) {
                    if (onToken) {
                        fullContent += char;
                        onToken(char, fullContent);
                        await new Promise(resolve => setTimeout(resolve, 10)); // 添加少许延迟
                    }
                }*/
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
        const apiEndpoint1 = (state.endpoint in knownURI ? knownURI[state.endpoint] : state.endpoint);
        const apiEndpoint2 = apiEndpoint1;
        const apiEndpoint = (apiEndpoint2 + '/chat/completions').replace(/(?<!:)\/\/+/g, '/');

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.bearer}`,
                'X-Title': 'UYP App',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        if (stream) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullContent = '';
            let fullReason = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

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
                            if (json.choices && json.choices[0].delta && json.choices[0].delta.reasoning_content) {
                                const token = json.choices[0].delta.reasoning_content;
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
}
function showManualInputDialog(messages, requestBody) {
    console.log(messages)
    return new Promise((resolve) => {
        const formatJSON = (obj) => {
            return JSON.stringify(obj, null, 2);
        };
        
        const formattedMessages = messages.map(msg => {
            let context
            if (msg.compressed) {
                context = "[这部分已经经过压缩]\n" + msg.compressed
            } else {
                context = msg.content
            }
            return `---[${msg.name}:${msg.role}]---\n\n${context}`;
        }).join('\n\n');

        const modalHtml = `
            <div data-id="manualInputModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            ">
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 1200px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    overflow-y: auto;
                ">
                    <h3 style="margin: 0;">手动输入回复</h3>
                    
                    <div style="display: flex; gap: 10px; height: calc(90vh - 200px);">
                        <!-- 左侧面板 -->
                        <div style="
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                            overflow-y: auto;
                        ">
                            <div style="
                                border: 1px solid #e0e0e0;
                                border-radius: 4px;
                                padding: 10px;
                            ">
                                <strong>完整会话记录:</strong>
                                <textarea data-id="formattedMessages" style="
                                    width: 100%;
                                    min-height: 200px;
                                    background: #f8f9fa;
                                    padding: 10px;
                                    border-radius: 4px;
                                    border: 1px solid #ddd;
                                    margin: 5px 0;
                                    font-size: 12px;
                                    font-family: monospace;
                                    resize: vertical;
                                ">${formattedMessages}</textarea>
                                <div style="
                                    display: flex;
                                    gap: 10px;
                                    margin-top: 5px;
                                ">
                                    <button data-id='copyMessages' style="
                                        padding: 4px 12px;
                                        background: #2196F3;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 12px;
                                    ">复制会话记录</button>
                                </div>
                            </div>

                           
                            
                            <div style="
                                border: 1px solid #e0e0e0;
                                border-radius: 4px;
                                padding: 10px;
                            ">
                                <strong>请求体:</strong>
                                <textarea data-id="requestBodyJson" style="
                                    width: 100%;
                                    min-height: 200px;
                                    background: #f8f9fa;
                                    padding: 10px;
                                    border-radius: 4px;
                                    border: 1px solid #ddd;
                                    margin: 5px 0;
                                    font-size: 12px;
                                    font-family: monospace;
                                    resize: vertical;
                                "></textarea>
                                <button data-id='copyJson' style="
                                    padding: 4px 12px;
                                    background: #2196F3;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    margin-top: 5px;
                                ">复制请求体</button>
                            </div>

                          
                        </div>

                        <!-- 右侧面板 -->
                        <div style="
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                        ">
                            <strong>输入回复:</strong>
                            <textarea data-id="manualResponse" style="
                                flex-grow: 1;
                                padding: 8px;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                resize: none;
                                font-family: monospace;
                                white-space: pre-wrap;
                            "></textarea>
                            
                            <div style="
                                display: flex;
                                justify-content: flex-end;
                                gap: 10px;
                            ">
                                <button data-id='confirm' style="
                                    padding: 8px 16px;
                                    background: #4CAF50;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                ">提交</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        const messagesText = modalContainer.querySelector('[data-id=formattedMessages]');
        const copyMessages = modalContainer.querySelector('[data-id=copyMessages]');
        const requestBodyJson = modalContainer.querySelector('[data-id=requestBodyJson]');
        const copyJson = modalContainer.querySelector('[data-id=copyJson]');
        const manualResponse = modalContainer.querySelector('[data-id=manualResponse]');
        const confirm = modalContainer.querySelector('[data-id=confirm]');

        messagesText.value = formattedMessages;
        requestBodyJson.value = JSON.stringify(requestBody, null, 2);
        copyMessages.addEventListener('click', () => copyToClipboard(messagesText, copyMessages));
        copyJson.addEventListener('click', () => copyToClipboard(requestBodyJson, copyJson));
        confirm.addEventListener('click', () => submitManualResponse());

        // 复制到剪贴板功能
        async function copyToClipboard (element, button) {
            try {
                await navigator.clipboard.writeText(element.value);
                const originalText = button.textContent;
                button.textContent = '已复制！';
                button.style.background = '#4CAF50';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '#2196F3';
                }, 1000);
            } catch (err) {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制');
            }
        };

        // 提交功能
        function submitManualResponse() {
            const response = manualResponse.value;
            document.body.removeChild(modalContainer);
            resolve(response);
        };

        // ESC键关闭功能
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(modalContainer);
                document.removeEventListener('keydown', escListener);
                throw new Error('用户取消');
            }
        });
    });
}