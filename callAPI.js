async function callAPI(messages, options = {}) {
    const {
        stream = true,
        onToken = null,
        onComplete = null,
        onError = null
    } = options;

    try {
        const requestBody = {
            model: state.model,
            messages: messages.map(msg => (msg.name + msg.content ? ({
                role: msg.role,
                content: msg.name ? msg.name + ": " + msg.content : msg.content,
                name: msg.name,
            }) : null)),
            stream
        };
        requestBody.messages = requestBody.messages.filter(msg => msg);

        state.parameters.forEach(param => {
            requestBody[param.name] = JSON.parse(param.value);
        });

        // 在callAPI函数中的manual模式部分修改为：
        if (state.endpoint === 'manual') {
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
        const apiEndpoint = state.endpoint === 'openrouter' 
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : state.endpoint + '/v1/chat/completions';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.bearer}`,
                'X-Title': 'UYP App',
                ...(state.endpoint === 'openrouter' ? {
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'UYP App'
                } : {})
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
    return new Promise((resolve) => {
        const formatJSON = (obj) => {
            return JSON.stringify(obj, null, 2);
        };

        const formattedMessages = messages.map(msg => {
            return `--- [${msg.name}:${msg.role}] --- \n\n${msg.content}`;
        }).join('\n\n');

        const defaultPrompt = `你需要帮我压缩下面的对话记录，我将发给别的AI。要求:
1. 对content部分进行压缩总结,但保持关键信息和文风
2. 总体压缩率大约30%
3. 确保压缩后的文本仍能被理解并一定的结构，连贯性和一定的文风和对话
4. 如果有章节信息 注意保持原文章节信息，如第一季（如果有） 第二章(如果有)等
5. 注意维持人物设定，摘要细节等
输入文本:
{{input}}

请直接返回压缩后的文本，不要有任何其他解释。`;

        const modalHtml = `
            <div id="manualInputModal" style="
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
                                <textarea id="formattedMessages" style="
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
                                    <button onclick="copyToClipboard('formattedMessages')" style="
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

                              <!-- 新增压缩相关区域 -->
                            <div style="
                                border: 1px solid #e0e0e0;
                                border-radius: 4px;
                                padding: 10px;
                            ">
                                <strong>压缩提示词:</strong>
                                <textarea id="compressionPrompt" style="
                                    width: 100%;
                                    height: 150px;
                                    background: #f8f9fa;
                                    padding: 10px;
                                    border-radius: 4px;
                                    border: 1px solid #ddd;
                                    margin: 5px 0;
                                    font-size: 12px;
                                    font-family: monospace;
                                    resize: vertical;
                                ">${defaultPrompt}</textarea>
                                
                                <div style="
                                    display: flex;
                                    gap: 10px;
                                    margin-top: 5px;
                                    align-items: center;
                                ">
                                    <input type="text" id="compressionEndpoint" value="http://localhost:5001" style="
                                        flex: 1;
                                        padding: 4px 8px;
                                        border: 1px solid #ddd;
                                        border-radius: 4px;
                                        font-size: 12px;
                                    ">
                                    <button onclick="compressText()" style="
                                        padding: 4px 12px;
                                        background: #673AB7;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 12px;
                                    ">压缩</button>
                                </div>
                            </div>
                            
                            <div style="
                                border: 1px solid #e0e0e0;
                                border-radius: 4px;
                                padding: 10px;
                            ">
                                <strong>请求体:</strong>
                                <textarea id="requestBodyJson" style="
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
                                ">${formatJSON(requestBody)}</textarea>
                                <button onclick="copyToClipboard('requestBodyJson')" style="
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
                            <textarea id="manualResponse" style="
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
                                <button onclick="submitManualResponse()" style="
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
        const prompt = document.getElementById('compressionPrompt');
        const endpoint = document.getElementById('compressionEndpoint');
        // auto save and load this two to state.compress
        state.compress = state.compress || {
            prompt,
            endpoint,
            cache: {}
        }
        prompt.addEventListener('change', (e) => {
            state.compress.prompt = e.target.value;
            saveState();
        })
        endpoint.addEventListener('change', (e) => {
            state.compress.endpoint = e.target.value;
            saveState();
        })
        if (state.compress) {
            prompt.value = state.compress.prompt;
            endpoint.value = state.compress.endpoint;
        }
        async function compressMessage(endpoint, message) {
            if (message && state.compress.cache[message]) {
                return state.compress.cache[message];
            }
            const pre_response = await fetch(endpoint + '/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                messages: [
                                    {
                                        role: "user",
                                        content: message
                                    }
                                ],
                                temperature: 0.3,
                                max_tokens: 512,
                            })
                        });
            const response = {
                ok: pre_response.ok,
                status: pre_response.status,
                json: await pre_response.json()
            }
            if (!response.ok) {
                return response
            } else {
                state.compress.cache[message] = response
                saveState();
                return response;
            }
        }
        window.compressText = async () => {
            const messages = document.getElementById('formattedMessages').value;
            const endpoint = document.getElementById('compressionEndpoint').value;
            const prompt = document.getElementById('compressionPrompt').value;
            const responseArea = document.getElementById('manualResponse');
            
            try {
                const requestBodyJson = JSON.parse(document.getElementById('requestBodyJson').value);
                let compressedMessages = [];
                
                // 处理每一条消息
                for (let msg of requestBody.messages) {
                    try {
                        // 如果是system消息，直接保留
                        if (msg.role === 'system' || msg.content.length < 100 || msg.role === 'user') {
                            compressedMessages.push(`---[${msg.name || ''}:${msg.role}]--- \n\n${msg.content}`);
                            continue;
                        }

                        // 构建压缩请求
                        const promptWithInput = prompt.replace('{{input}}', 
                            msg.content
                        );

                        const response = await compressMessage(endpoint, promptWithInput);

                        

                        if (!response.ok) {
                            responseArea.value = `压缩第 ${compressedMessages.length + 1} 条消息失败:\nHTTP ${response.status}\n\n已压缩的消息:\n\n${compressedMessages.join('\n\n')}`;
                            return;
                        }

                        const data = response.json;
                        if (data.choices && data.choices[0] && data.choices[0].message) {
                            // compressedMessages.push(data.choices[0].message.content.trim());
                            // `--- [${msg.name || ''}:${msg.role}] --- 
                            const originLength = msg.content.length;
                            compressedMessages.push(`---[${msg.name || ''}:${msg.role}:原本字数${originLength}]--- \n\n${data.choices[0].message.content.trim()}`);
                        } else {
                            responseArea.value = `压缩第 ${compressedMessages.length + 1} 条消息返回了意外的格式\n\n已压缩的消息:\n\n${compressedMessages.join('\n\n')}`;
                            return;
                        }

                        // 添加进度提示
                        responseArea.value = `正在压缩... (${compressedMessages.length}/${requestBodyJson.messages.length})\n\n` +
                            compressedMessages.join('\n\n');

                    } catch (err) {
                        responseArea.value = `处理第 ${compressedMessages.length + 1} 条消息时发生错误:\n${err.message}\n\n已压缩的消息:\n\n${compressedMessages.join('\n\n')}`;
                        return;
                    }
                }

                // 最终输出
                responseArea.value = "已经压缩过对话或者描写，在你的回复中需要按照最近一个输出章节的字数来决定长度，而不只是压缩后的\n" + compressedMessages.join('\n\n');

            } catch (error) {
                // JSON解析错误或其他初始化错误
                responseArea.value = `初始化压缩任务失败:\n${error.message}`;
            }
        };

        // 复制到剪贴板功能
        window.copyToClipboard = async (elementId) => {
            const element = document.getElementById(elementId);
            try {
                await navigator.clipboard.writeText(element.value);
                const button = element.nextElementSibling;
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
        window.submitManualResponse = () => {
            const response = document.getElementById('manualResponse').value;
            document.body.removeChild(modalContainer);
            resolve(response);
            delete window.submitManualResponse;
            delete window.copyToClipboard;
            delete window.compressText;
        };

        // ESC键关闭功能
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(modalContainer);
                document.removeEventListener('keydown', escListener);
                resolve('');
                delete window.submitManualResponse;
                delete window.copyToClipboard;
                delete window.compressText;
            }
        });
    });
}