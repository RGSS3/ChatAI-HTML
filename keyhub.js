const KeyHub = window.KeyHub = {
    keys: {}, // 保存所有密钥
    onUpdate: null,
    setOnUpdate: function(callback) {
        this.onUpdate = callback;
    },
    setContent: function(content) {
        this.keys = content;
    },
    getContent: function() {
        return this.keys;
    },
    showKeyManager: async function() {
        return new Promise((resolve, reject) => {
            const modalHtml = `
                <div data-id="keyManagerModal" style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10001;
                    font-family: 'Arial', sans-serif;
                    color: #333;
                ">
                    <div style="
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        width: 90%;
                        max-width: 800px;
                        max-height: 80vh;
                        overflow-y: auto;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    ">
                        <h3 style="margin-bottom: 15px; color: #555;">密钥管理器</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f2f2f2;">
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">选择</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">名称</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">密钥</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">注释</th>
                                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">操作</th>
                                </tr>
                            </thead>
                            <tbody data-id="keyTableBody">
                                <!-- 密钥列表动态填充 -->
                            </tbody>
                        </table>
                        <button data-id="addKeyButton" style="
                            background-color: #5cb85c;
                            color: white;
                            padding: 12px 20px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            margin-top: 15px;
                        ">添加密钥</button>
                        <button data-id="dismissButton" style="
                            background-color: #d9534f;
                            color: white;
                            padding: 12px 20px;
                            border: none;
                            border-radius: 5px;
                            cursor: pointer;
                            font-size: 14px;
                            margin-top: 15px;
                        ">关闭窗口</button>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer);

            const keyTableBody = modalContainer.querySelector('[data-id="keyTableBody"]');
            const addKeyButton = modalContainer.querySelector('[data-id="addKeyButton"]');

            let selectedKeyId = null;

            // 渲染密钥列表
            function renderKeyList() {
                keyTableBody.innerHTML = '';
                Object.keys(KeyHub.keys).forEach(keyId => {
                    const key = KeyHub.keys[keyId];
                    const maskedKey = key.key.substring(0, 4) + '***' + key.key.substring(key.key.length - 4);
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                            <input type="radio" name="selectedKey">
                        </td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: left;"></td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: left;"></td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: left;"></td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: left;">
                            <button data-action="edit" data-keyid="${keyId}" style="
                                background-color: #f0ad4e;
                                color: white;
                                padding: 8px 12px;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                font-size: 12px;
                                margin-right: 5px;
                            ">编辑</button>
                            <button data-action="delete" data-keyid="${keyId}" style="
                                background-color: #d9534f;
                                color: white;
                                padding: 8px 12px;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                font-size: 12px;
                            ">删除</button>
                        </td>
                    `;
                    const radioInput = row.querySelector('input[type="radio"]');
                    if (selectedKeyId === keyId) {
                        radioInput.checked = true;
                    }
                    radioInput.value = keyId;
                    const idTd = row.querySelector('td:nth-child(2)');
                    idTd.textContent = keyId;
                    const keyTd = row.querySelector('td:nth-child(3)');
                    keyTd.textContent = maskedKey;
                    const commentTd = row.querySelector('td:nth-child(4)');
                    commentTd.textContent = key.comment || '';
                    keyTableBody.appendChild(row);
                });
            }

            renderKeyList();

            // 选择密钥
            keyTableBody.addEventListener('click', (e) => {
                if (e.target.name === 'selectedKey') {
                    selectedKeyId = e.target.value;
                }
            });

            // 添加密钥按钮
            addKeyButton.addEventListener('click', () => {
                showKeyEditModal();
            });

            // 编辑和删除密钥
            keyTableBody.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const keyId = e.target.dataset.keyid;

                if (action === 'edit') {
                    showKeyEditModal(keyId);
                } else if (action === 'delete') {
                    if (confirm('确定要删除这个密钥吗？')) {
                        KeyHub.removeKey(keyId);
                        renderKeyList();
                        KeyHub.onUpdate();
                    }
                }
            });

            // 密钥编辑模态框
            function showKeyEditModal(keyId = null) {
                const isEdit = keyId !== null;
                const key = isEdit ? KeyHub.keys[keyId] : {};

                const editModalHtml = `
                    <div data-id="keyEditModal" style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 10002;
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
                            <h3 style="margin-bottom: 15px; color: #555;">${isEdit ? '编辑' : '添加'} 密钥</h3>
                            <form data-id="keyEditForm">
                                <div style="margin-bottom: 10px;">
                                    <label style="display: block; margin-bottom: 5px;">名称:</label>
                                    <input type="text" data-name="name" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;" required>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="display: block; margin-bottom: 5px;">密钥:</label>
                                    <input type="text" data-name="key" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;" required>
                                </div>
                                <div style="margin-bottom: 10px;">
                                    <label style="display: block; margin-bottom: 5px;">注释:</label>
                                    <textarea data-name="comment" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;"></textarea>
                                </div>
                                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                                    <button type="button" data-action='save' style="
                                        background-color: #5cb85c;
                                        color: white;
                                        padding: 12px 20px;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 14px;
                                    ">保存</button>
                                    <button type="button" data-action="cancel" style="
                                        background-color: #d9534f;
                                        color: white;
                                        padding: 12px 20px;
                                        border: none;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 14px;
                                    ">取消</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;

                const editModalContainer = document.createElement('div');
                editModalContainer.innerHTML = editModalHtml;
                document.body.appendChild(editModalContainer);

                const keyEditForm = editModalContainer.querySelector('[data-id="keyEditForm"]');
                const nameInput = keyEditForm.querySelector('[data-name="name"]');
                const keyInput = keyEditForm.querySelector('[data-name="key"]');
                const commentTextarea = keyEditForm.querySelector('[data-name="comment"]');
                const saveButton = keyEditForm.querySelector('[data-action="save"]');
                if (isEdit) {
                    nameInput.value = key.name;
                    keyInput.value = key.key;
                    commentTextarea.value = key.comment || '';
                }

                saveButton.addEventListener('click', (e) => {
                    const name = nameInput.value;
                    const key = keyInput.value;
                    const comment = commentTextarea.value;

                    if (isEdit) {
                        KeyHub.keys[keyId] = {
                            name: name,
                            key: key,
                            comment: comment
                        };
                        KeyHub.onUpdate();
                    } else {
                        const newKeyId = name;
                        KeyHub.addKey(newKeyId, name, key, comment);
                    }
                    KeyHub.onUpdate();
                    renderKeyList();
                    document.body.removeChild(editModalContainer);
                });

                // 取消按钮
                keyEditForm.querySelector('[data-action="cancel"]').addEventListener('click', () => {
                    document.body.removeChild(editModalContainer);
                });
                // ESC键关闭功能
                editModalContainer.addEventListener('keydown', function escListener(e) {
                    if (e.key === 'Escape') {
                        document.body.removeChild(editModalContainer);
                    }
                });
                                
                 // 移除弹窗
                 editModalContainer.addEventListener('click', (e) => {
                    if (e.target === editModalContainer) {
                        document.body.removeChild(editModalContainer);
                    }
                });
            }

            // 确定按钮
            modalContainer.addEventListener('click', (e) => {
                if (e.target.name === 'selectedKey') {
                    document.body.removeChild(modalContainer);
                     resolve(e.target.value);
                }
            });
            // ESC键关闭功能
            modalContainer.addEventListener('keydown', function escListener(e) {
                if (e.key === 'Escape') {
                    document.body.removeChild(modalContainer);
                    reject();
                }
            });

            modalContainer.querySelector('[data-id=dismissButton]').addEventListener('click', () => {
                document.body.removeChild(modalContainer);
                reject();
            })
                            
             // 移除弹窗
             modalContainer.addEventListener('click', (e) => {
                if (e.target === modalContainer) {
                    document.body.removeChild(modalContainer);
                    reject()
                }
            });
        });
    },
    addKey: function(id, name, key, comment = '') {
        this.keys[id] = {
            name: name,
            key: key,
            comment: comment
        };
    },
    removeKey: function(id) {
        delete this.keys[id];
    },
    getKey: function(id) {
        return this.keys[id] ? this.keys[id].key : null;
    },
    getHeader: function(header, key) {
        let x = this.getKey(key);
        if (x !== null) {
            header['Authorization'] = `Bearer ${x}`;
        }
        return header;
    }
};