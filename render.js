function renderMessages() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';

    state.chatHistory.forEach((msg, index) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${msg.role}`;
        msgDiv.style.marginBottom = '1rem';
        msgDiv.style.padding = '0.5rem';
        msgDiv.style.borderRadius = '0.25rem';
        msgDiv.style.backgroundColor = msg.role === 'user' ? '#e3f2fd' : '#f5f5f5';
        const isLast = index === state.chatHistory.length - 1;
        const lastButton = isLast ? `<button class='resend-btn' style='border: none; background: none; color: #666; cursor: pointer; font-size: 0.8rem;'>重发</button>` : '';

        // 如果是loading消息，直接使用content中的HTML
        if (msg.isLoading) {
            msgDiv.innerHTML = `
        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.3rem; display: flex; justify-content: space-between; align-items: center;">
            <span>${msg.name} - ${new Date(msg.timestamp).toLocaleString()}</span>
        </div>
        <div class="message-content">${msg.content}</div>
    `;
        } else {
            let content;
            try {
                content = marked.parse(msg.content);
            } catch (e) {
                content = msg.content;
            }
            msgDiv.innerHTML = `
        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.3rem; display: flex; justify-content: space-between; align-items: center;">
            <span>${msg.name} - ${new Date(msg.timestamp).toLocaleString()}</span>
            <div class="message-actions" style="display: flex; gap: 0.5rem;">
                <span class="text-length" style="font-size: 0.8rem; color: #666;">${msg.content.length}字</span>
                <button class="edit-btn" style="border: none; background: none; color: #666; cursor: pointer; font-size: 0.8rem;">修改</button>
                <button class="delete-btn" style="border: none; background: none; color: #666; cursor: pointer; font-size: 0.8rem;">删除</button>
                <button class="add-btn" style="border: none; background: none; color: #666; cursor: pointer; font-size: 0.8rem;">添加</button>
                <button class="compress-btn" style="border: none; background: none; color: #666; cursor: pointer; font-size: 0.8rem;">压缩</button>
                ${lastButton}
            </div>
        </div>
        <div class="message-content">${content}</div>
    `;
            

            // 添加事件监听器
            const editBtn = msgDiv.querySelector('.edit-btn');
            const deleteBtn = msgDiv.querySelector('.delete-btn');
            const addBtn = msgDiv.querySelector('.add-btn');
            const resendBtn = msgDiv.querySelector('.resend-btn');
            const compressBtn = msgDiv.querySelector('.compress-btn');


            compressBtn.addEventListener('click', async () => {
                const text = msg.content;
                const compressedText = await compress(text, msg.compressed);
                if (compressedText != null) {
                    msg.compressed = compressedText
                    saveState();
                    renderMessages();
                }
            });

            editBtn.addEventListener('click', () => {
                showMessageDialog('edit', index, msg);
            });

            deleteBtn.addEventListener('click', () => {
                if (confirm('确定要删除这条消息吗？')) {
                    state.trash.push(state.chatHistory[index]);
                    state.chatHistory.splice(index, 1);
                    saveState();
                    renderMessages();
                }
            });

            addBtn.addEventListener('click', () => {
                showMessageDialog('add', index);
            });
            if (resendBtn) {
                resendBtn.addEventListener('click', resendMessage);
            }
        }
        messagesDiv.appendChild(msgDiv);
    });

    // 滚动到底部
    setTimeout(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 0);

    // 代码高亮
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}



function resendMessage() {
    if (state.chatHistory.length > 0 && state.chatHistory[state.chatHistory.length - 1].role == 'assistant') {
        state.trash.push(state.chatHistory[state.chatHistory.length - 1]);
        state.chatHistory.splice(state.chatHistory.length - 1, 1);
        saveState();
        nextMessage();
    }
}


// 添加消息对话框函数
function showMessageDialog(type, index, msg = null) {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
background: white;
padding: 1rem;
border-radius: 0.5rem;
box-shadow: 0 2px 10px rgba(0,0,0,0.1);
z-index: 1000;
width: 80%;
max-width: 500px;
`;

    // 对话框内容
    dialog.innerHTML = `
<h3 style="margin: 0 0 1rem 0">${type === 'edit' ? '修改消息' : '添加消息'}</h3>
<div style="margin-bottom: 1rem">
    <label style="display: block; margin-bottom: 0.5rem">角色：</label>
    <input type="text" id="role-input" value="" 
        style="width: 95%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem;">
</div>
<div style="margin-bottom: 1rem">
    <label style="display: block; margin-bottom: 0.5rem">角色名：</label>
    <input type="text" id="name-input" value="" 
        style="width: 95%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem;">
</div>
<div style="margin-bottom: 1rem">
    <label style="display: block; margin-bottom: 0.5rem">内容：</label>
    <textarea id="content-input" style="width: 95%; height: 200px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem;"></textarea>
</div>
<div style="margin-bottom: 1rem">
    <label style="display: block; margin-bottom: 0.5rem">压缩内容：</label>
    <textarea id="compressed-input" style="width: 95%; height: 200px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem;"></textarea>
</div>

<div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
    <button id="cancel-btn" style="padding: 0.5rem 1rem; border: 1px solid #ddd; border-radius: 0.25rem; background: white; cursor: pointer;">取消</button>
    <button id="confirm-btn" style="padding: 0.5rem 1rem; border: none; border-radius: 0.25rem; background: #1976d2; color: white; cursor: pointer;">确定</button>
</div>
`;
makeCopyContentButton(dialog)

    // 创建遮罩
    const overlay = document.createElement('div');
    overlay.style.cssText = `
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
background: rgba(0,0,0,0.5);
z-index: 999;
`;

    // 添加到文档
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    // 事件处理
    const cancelBtn = dialog.querySelector('#cancel-btn');
    const confirmBtn = dialog.querySelector('#confirm-btn');
    const roleInput = dialog.querySelector('#role-input');
    const contentInput = dialog.querySelector('#content-input');
    const compressedInput = dialog.querySelector('#compressed-input');
    const nameInput = dialog.querySelector('#name-input');

    contentInput.value = msg ? msg.content : '';
    compressedInput.value = msg ? (msg.compressed || '') : '';
    nameInput.value = msg ? (msg.name || msg.role) : 'user'
    roleInput.value = msg ? msg.role : 'user';

    cancelBtn.addEventListener('click', () => {
        overlay.remove();
        dialog.remove();
    });

    confirmBtn.addEventListener('click', () => {
        const role = roleInput.value.trim();
        const content = contentInput.value.trim();
        const name = nameInput.value.trim();
        const compressed = compressedInput.value.trim();

        if (!role || !content) {
            alert('角色和内容不能为空');
            return;
        }

        if (type === 'edit') {
            // 修改消息
            state.chatHistory[index] = {
                role,
                content,
                name,
                compressed,
                timestamp: Date.now()
            };
        } else {
            // 添加消息
            state.chatHistory.splice(index, 0, {
                role,
                content,
                name,
                compressed,
                timestamp: Date.now()
            });
        }

        saveState();
        renderMessages();
        overlay.remove();
        dialog.remove();
    });
}

async function compress(originText, previous) {
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
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  `;

  makeCopyContentButton(modal)
  // Left column
  const leftColumn = document.createElement('div');
  
  const promptLabel = document.createElement('div');
  promptLabel.textContent = '压缩提示:';
  
  const promptText = document.createElement('textarea');
  promptText.style.cssText = `
    width: 100%;
    height: 150px;
    margin: 10px 0;
    padding: 8px;
  `;
  promptText.value = state.compress.prompt || `请按照以下要求对提供的小说章节或对话进行压缩处理，确保为后续生成新章节提供参考背景，同时结合新的生成要求创作新章节：

1. **压缩目标**：将原文压缩至约原文长度的40%，约800字符左右，确保文本连贯，重点突出关键剧情、人物关系及伏笔。细节描写和冗长对话只需简略带过。
2. **章节结构**：保留原章节标题（如“第一季 第二章”）不做修改。
3. **文风概述**：用方括号简要概括原文风格及修辞特点，体现文笔特征。
4. **原文摘录**：从原文中摘录1-2段最具代表性的语句（以主角和主要人物的语言为主），标注为「原文摘录」，以免风格丢失。
5. **剧情要求**：剧情需精炼但完整，保留主要伏笔、人物设定、互动方式与整体氛围，不遗漏关键情节。

压缩后的文本将作为背景材料，在后续新章节生成时与新的要求结合，确保文风、节奏和人物延续，并适当铺垫后续情节。

---

### 输出格式

**正文 第?季 第?章**（如适用）  
**概述1**：概述原文风格与修辞特点  
**概述2**： 概述这一章的人物的主要观点和意图
**压缩剧情**：精炼后的关键情节和人物关系描述  
**原文摘录**：「（摘录体现文笔风格的语句）」  
**[End]

### 原文
{{input}}

请完成上述压缩任务（约400字符左右）
`; // Default prompt
  
  const endpointLabel = document.createElement('div');
  endpointLabel.textContent = 'API Endpoint:';
  
  const endpointInput = document.createElement('input');
  endpointInput.style.cssText = `
    width: 100%;
    margin: 10px 0;
    padding: 8px;
  `;
  endpointInput.value = state.compress.endpoint || 'http://localhost:5001';

  const endpointParse = document.createElement('button')
  endpointParse.textContent = '解析';
  endpointParse.style.cssText = `
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

  endpointParse.addEventListener('click', async () => {
      try {
          const config = await parseEndpoint(endpointInput.value || '')
          endpointInput.value = JSON.stringify(config)
          endpointInput.dispatchEvent(new Event('input'))
      } catch (error) {
          pageAlert(error.message)
      }
  });

  
  const inputLabel = document.createElement('div');
  inputLabel.textContent = '待压缩内容:';
  
  const inputText = document.createElement('textarea');
  inputText.style.cssText = `
    width: 100%;
    height: 150px;
    margin: 10px 0;
    padding: 8px;
  `;
  inputText.value = originText;

  // Right column - Result
  const rightColumn = document.createElement('div');
  
  const resultLabel = document.createElement('div');
  resultLabel.textContent = '压缩结果:';
  
  const resultText = document.createElement('textarea');
  resultText.style.cssText = `
    width: 100%;
    height: 400px;
    margin: 10px 0;
    padding: 8px;
  `;

  // Buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    grid-column: span 2;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 10px;
  `;

  const compressBtn = document.createElement('button');
  compressBtn.textContent = '压缩';
  compressBtn.style.cssText = `
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确认';
  confirmBtn.style.cssText = `
    padding: 8px 16px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

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

  // Handle events
  promptText.addEventListener('input', () => {
    state.compress.prompt = promptText.value;
  });

  endpointInput.addEventListener('input', () => {
    state.compress.endpoint = endpointInput.value;
  });

  resultText.value = previous || '';



  let resolvePromise;
  const promise = new Promise(resolve => {
    resolvePromise = resolve;
  });

  

compressBtn.onclick = async () => {
  try {
    compressBtn.disabled = true;
    compressBtn.textContent = '压缩中...';

    const config = await parseEndpoint(endpointInput.value || '');
    if (config) {
        endpointInput.value = JSON.stringify(config);
        // dispatch onInput
        endpointInput.dispatchEvent(new Event('input'));
    }
    let headers = {
        'Content-Type': 'application/json'
    }
    if (config.key) {
        headers['Authorization'] = 'Bearer ' + config.key
    };
    

    const response = await fetch(config.url + '/v1/chat/completions', {
      method: 'POST', 
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {role: "user", content: await processContextV2(inputText.value, promptText.value)},
        ],
        ...config.params, // Spread additional parameters
        max_tokens: config.params.max_tokens || 800,
        temperature: config.params.temperature || 0.4,
      })
    });

    const result = await response.json();
    resultText.value = result?.choices?.[0]?.message?.content || '';
  } catch(err) {
    alert('Error: ' + err.message); 
  } finally {
    compressBtn.disabled = false;
    compressBtn.textContent = '压缩';
  }
};

  confirmBtn.onclick = () => {
    modal.remove();
    resolvePromise(resultText.value);
  };

  cancelBtn.onclick = () => {
    modal.remove();
    resolvePromise(null);
  };

  // Assemble modal
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(compressBtn);
  buttonContainer.appendChild(confirmBtn);
  
  leftColumn.appendChild(promptLabel);
  leftColumn.appendChild(promptText);
  leftColumn.appendChild(endpointLabel);
  leftColumn.appendChild(endpointInput);
  leftColumn.appendChild(endpointParse);
  leftColumn.appendChild(inputLabel);
  leftColumn.appendChild(inputText);

  rightColumn.appendChild(resultLabel);
  rightColumn.appendChild(resultText);
  
  content.appendChild(leftColumn);
  content.appendChild(rightColumn);
  content.appendChild(buttonContainer);
  
  modal.appendChild(content);
  document.body.appendChild(modal);

  return promise;
}
