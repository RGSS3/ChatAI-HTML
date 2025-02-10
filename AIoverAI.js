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


async function parseEndpoint(endpoint) {
  let config;
  if(endpoint.trim().startsWith('{')) {
    // Try parse as JSON directly
    try {
      config = JSON.parse(endpoint);
    } catch(e) {
      throw new Error('Invalid JSON format');
    }
  } else {
    // Use primitiveAI to get config
    try {
      const prompt = `Convert the following API endpoint configuration to a JSON object with these fields:
- url: The API endpoint URL
- model: The model name to use
- params: Additional parameters like temperature, max_tokens etc.

Known: Openrouter is 'https://openrouter.ai/api'
If not provided, provide max_tokens and temperature and stop_sequences

Only return the JSON object, no other text.

Input: ${endpoint}`;

      const result = await primitiveAI(prompt);
      
      try {
        config = JSON.parse(result);
      } catch(e) {
        throw new Error('Failed to parse AI response as JSON');
      }
    } catch(e) {
      throw new Error('Failed to process endpoint: ' + e.message);
    }
  }

  // Validate config
  if(!config.url || typeof config.url !== 'string') {
    config.url = 'https://openrouter.ai/api/v1/chat/completions';
  }
  if(!config.model || typeof config.model !== 'string') {
    config.model = state.model;
  }
  if(!config.params || typeof config.params !== 'object') {
    config.params = state.params;
  }
  if(!config.key || typeof config.key !== 'string') {
    config.key = state.bearer;
  }

  // Update input and trigger change event
  const configStr = JSON.stringify(config, null, 2);
  endpoint = configStr;
  
  return config;
}