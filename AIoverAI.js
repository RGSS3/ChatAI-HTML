async function makeCopyContentButton(div, scenario = null) {
    // 创建复制按钮
    const copyButton = document.createElement('button');
    copyButton.innerHTML = '📋';
    copyButton.style.cssText = `
        position: absolute;
        top: 5px;
        left: 5px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 2px 6px;
        cursor: pointer;
        z-index: 10000;
        font-size: 14px;
    `;

    // 确保div是相对定位
    /*
    if (getComputedStyle(div).position === 'static') {
        div.style.position = 'relative';
    }*/
    
    div.appendChild(copyButton);

    copyButton.addEventListener('click', async () => {
        let content = [];
        
        // 递归函数来收集内容
        function collectContent(element) {
            if (!element) return;
            
            // 处理表单元素
            if (element instanceof HTMLInputElement || 
                element instanceof HTMLTextAreaElement || 
                element instanceof HTMLSelectElement) {
                
                if (element instanceof HTMLInputElement) {
                    switch (element.type) {
                        case 'checkbox':
                        case 'radio':
                            content.push(`${element.name || element.id || 'input'}: ${element.checked}`);
                            break;
                        case 'text':
                        case 'password':
                        case 'email':
                        case 'number':
                            if (element.value) {
                                content.push(`${element.name || element.id || 'input'}: ${element.value}`);
                            }
                            break;
                    }
                } else if (element instanceof HTMLTextAreaElement) {
                    if (element.value) {
                        content.push(`${element.name || element.id || 'textarea'}: ${element.value}`);
                    }
                } else if (element instanceof HTMLSelectElement) {
                    const selectedOption = element.options[element.selectedIndex];
                    if (selectedOption) {
                        content.push(`${element.name || element.id || 'select'}: [${selectedOption.text}, ${selectedOption.value}]`);
                    }
                }
            }
            // 处理图片
            else if (element instanceof HTMLImageElement) {
                if (element.alt) content.push(`Image alt: ${element.alt}`);
                if (element.title) content.push(`Image title: ${element.title}`);
            }
            // 如果元素本身有文本内容且不是表单元素
            else if (element.childNodes.length === 1 && 
                     element.firstChild.nodeType === Node.TEXT_NODE &&
                     element.firstChild.textContent.trim()) {
                content.push(element.firstChild.textContent.trim());
            }
            
            // 递归处理子元素
            for (const child of element.children) {
                collectContent(child);
            }
        }

        collectContent(div);
        
        // 过滤掉空内容并合并
        const finalContent = (scenario || '') + "\n" + content.filter(Boolean).join('\n');
        
        try {
            await navigator.clipboard.writeText(finalContent);
            await pageAlert('内容已复制到剪贴板', '成功');
        } catch (err) {
            console.error('复制失败:', err);
            await pageAlert('复制失败，请重试', '错误');
        }
    });

    return copyButton;
}

async function primitiveAI(query) {
  return new Promise((resolve, reject) => {
    // Create modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      width: 80%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    `;

    // Endpoint input
    state.primitive = state.primitive || {};
    const endpointLabel = document.createElement('div');
    endpointLabel.textContent = 'API Endpoint:';
    const endpoint = document.createElement('input');
    endpoint.type = 'text';
    endpoint.value = state.primitive.endpoint || state.endpoint || 'http://localhost:5001';

    endpoint.style.cssText = `
      width: 100%;
      padding: 8px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
    `;
    endpoint.addEventListener('input', e => {
      state.primitive.endpoint = e.target.value;
    });
    const keyLabel = document.createElement('div');
    keyLabel.textContent = 'API Key:';
    const vkey = document.createElement('input');
    vkey.type = 'password';
    vkey.value = state.primitive.key || state.bearer || '';
    vkey.style.cssText = `
      width: 100%;
      padding: 8px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
    `;
    vkey.addEventListener('input', e => {
        state.primitive.key = e.target.value;
    })

    // Parameters textarea
    const paramsLabel = document.createElement('div');
    paramsLabel.textContent = 'Parameters:';
    const params = document.createElement('textarea');
    params.value = state.primitive.params || JSON.stringify({
      temperature: 0.7,
      model: 'gpt-3.5-turbo',
      max_tokens: 2000
    }, null, 2);
    params.style.cssText = `
      width: 100%;
      height: 100px;
      padding: 8px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: monospace;
    `;
    params.addEventListener('input', e => {
      state.primitive.params = e.target.value;
    });

    // Query textarea
    const queryLabel = document.createElement('div');
    queryLabel.textContent = 'Request:';
    const queryInput = document.createElement('textarea');
    queryInput.value = query;
    queryInput.style.cssText = `
      width: 100%;
      height: 100px;
      padding: 8px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: monospace;
    `;

    // Output textarea
    const outputLabel = document.createElement('div');
    outputLabel.textContent = 'Result:';
    const output = document.createElement('textarea');
    output.readOnly = false;
    output.style.cssText = `
      width: 100%;
      height: 100px;
      padding: 8px;
      margin: 8px 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #f5f5f5;
      font-family: monospace;
    `;

    // Button container
    const buttons = document.createElement('div');
    buttons.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 15px;
    `;

    // Query button
    const queryBtn = document.createElement('button');
    queryBtn.textContent = '查询';
    queryBtn.style.cssText = `
      padding: 8px 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    queryBtn.onclick = async () => {
      try {
        const key = vkey.value;
        const keyLine = key ? {'Authorization': 'Bearer ' + key} : {};
        const url = endpoint.value == 'openrouter' ? 'https://openrouter.ai/api' : endpoint.value;
        queryBtn.disabled = true;
        const response = await fetch(url + '/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...keyLine
          },
          body: JSON.stringify({
            ...JSON.parse(params.value),
            messages: [{
                role: 'user',
                content: queryInput.value
            }]
          })
        });
        const result = await response.json()
        //output.value = JSON.stringify(result.choices[0].message, null, 2);
        output.value = result.choices[0].message.content;
        queryBtn.disabled = false;
      } catch(err) {
        output.value = 'Error: ' + err.message;
        queryBtn.disabled = false;
      }
    };

    // Confirm button
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认';
    confirmBtn.style.cssText = `
      padding: 8px 16px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    confirmBtn.onclick = () => {
      document.body.removeChild(modal);
      resolve(output.value);
    };

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => {
      document.body.removeChild(modal);
      reject('User cancelled the operation');
    };

    // Assemble everything
    buttons.appendChild(queryBtn);
    buttons.appendChild(confirmBtn);
    buttons.appendChild(cancelBtn);

    content.appendChild(endpointLabel);
    content.appendChild(endpoint);
    content.appendChild(keyLabel);
    content.appendChild(vkey);
    content.appendChild(paramsLabel);
    content.appendChild(params);
    content.appendChild(queryLabel);
    content.appendChild(queryInput);
    content.appendChild(outputLabel);
    content.appendChild(output);
    content.appendChild(buttons);

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close on outside click
    /*
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        reject('User cancelled the operation');
      }
    });*/
  });
}

async function pageAlert(content, title = '') {
    // 创建警告框
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10001;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
        opacity: 0;
    `;

    // 添加标题（如果有）
    if (title) {
        const titleElement = document.createElement('div');
        titleElement.style.cssText = `
            font-weight: bold;
            font-size: 16px;
            color: #333;
        `;
        titleElement.textContent = title;
        alertDiv.appendChild(titleElement);
    }

    // 添加内容
    const contentElement = document.createElement('div');
    contentElement.style.cssText = `
        font-size: 14px;
        color: #666;
    `;
    contentElement.textContent = content;
    alertDiv.appendChild(contentElement);

    document.body.appendChild(alertDiv);

    // 显示动画
    setTimeout(() => {
        alertDiv.style.opacity = '1';
    }, 10);

    // 3秒后消失
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    alertDiv.style.opacity = '0';
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    alertDiv.remove();
}

async function generalSelect(list = [], title = "请选择一项", defaultValue = null, initialValue = null) {
    return new Promise((resolve, reject) => {
        const modalHtml = `
            <div data-id="generalSelectModal" style="
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
                font-family: 'Arial', sans-serif;
                color: #333;
            ">
                <div style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                ">
                    <h3 style="margin-bottom: 15px; color: #555;">${title}</h3>
                    <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                        <input type="text" data-id="searchInput" placeholder="搜索..." style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            font-size: 14px;
                            box-sizing: border-box;
                        ">
                        <ul data-id="suggestionList" style="
                            list-style: none;
                            padding: 0;
                            margin: 0;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                            background-color: #f9f9f9;
                            max-height: 200px;
                            overflow-y: auto;
                            display: none; /* 初始状态隐藏 */
                            position: absolute;
                            z-index: 10001;
                            width: calc(100% - 2px); /* 减去边框宽度 */
                        "></ul>
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button data-id="confirmButton" style="
                            background-color: #5cb85c;
                            color: white;
                            padding: 12px 20px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        ">确定</button>
                        <button data-id="cancelButton" style="
                            background-color: #d9534f;
                            color: white;
                            padding: 12px 20px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                        ">取消</button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);

        const searchInput = modalContainer.querySelector('[data-id="searchInput"]');
        const suggestionList = modalContainer.querySelector('[data-id="suggestionList"]');
        const confirmButton = modalContainer.querySelector('[data-id="confirmButton"]');
        const cancelButton = modalContainer.querySelector('[data-id="cancelButton"]');

        let selectedId = initialValue || null;

        // 填充建议列表
        function populateSuggestions(items) {
            suggestionList.innerHTML = '';
            items.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = item.text || item.id;
                listItem.style.padding = '10px';
                listItem.style.cursor = 'pointer';
                listItem.addEventListener('mouseover', () => {
                    listItem.style.backgroundColor = '#ddd';
                });
                listItem.addEventListener('mouseout', () => {
                    listItem.style.backgroundColor = '';
                });
                listItem.addEventListener('click', () => {
                    selectedId = item.id;
                    searchInput.value = item.text || item.id;
                    suggestionList.style.display = 'none';
                });
                suggestionList.appendChild(listItem);
            });
        }

        // 搜索功能
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredList = list.filter(item => (item.text || item.id || '').toLowerCase().includes(searchTerm));
            populateSuggestions(filteredList);
            suggestionList.style.display = filteredList.length > 0 ? 'block' : 'none';
        });

        // 失去焦点时隐藏建议列表
        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionList.style.display = 'none';
            }, 100); // 延迟隐藏，防止点击事件失效
        });

        // 确定按钮
        confirmButton.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
            if (selectedId) {
                resolve(selectedId);
            } else if (defaultValue !== null) {
                resolve(defaultValue);
            } else {
                reject();
            }
        });

        // 取消按钮
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modalContainer);
            if (defaultValue !== null) {
                resolve(defaultValue);
            } else {
                reject();
            }
        });

        // ESC键关闭功能
        const escListener = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modalContainer);
                document.removeEventListener('keydown', escListener);
                if (defaultValue !== null) {
                    resolve(defaultValue);
                } else {
                    reject();
                }
            }
        };

        document.addEventListener('keydown', escListener);

        // 移除弹窗
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) {
                document.body.removeChild(modalContainer);
                document.removeEventListener('keydown', escListener);
                if (defaultValue !== null) {
                    resolve(defaultValue);
                } else {
                    reject();
                }
            }
        });
    });
}

