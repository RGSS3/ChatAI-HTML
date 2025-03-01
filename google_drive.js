let tokenClient;
let gapiInited;
let gisInited;
let accessToken;
let signedIn;
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: GOOGLE_API_CONFIG.apiKey,
        clientId: GOOGLE_API_CONFIG.clientId,
        scope: GOOGLE_API_CONFIG.scope,
        discoveryDocs: GOOGLE_API_CONFIG.discoveryDocs,
    });
    gapiInited = true;
    maybeEnableButtons();
    console.log('gapiInited');
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_API_CONFIG.clientId,
        scope: GOOGLE_API_CONFIG.scope,
        callback:  async (resp) => {
            if (resp.error) {
                console.log('Google 登录失败:', resp);
                return;
            }
            accessToken = resp.access_token;
            console.log('gisLoaded ', resp);
            await createOrGetFolder();
            updateSigninStatus(true);
        },
        prompt: ''
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        handleAuthClick(); // 自动登录
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error) {
            console.log('Google 登录失败:', resp);
            return;
        }
        await createOrGetFolder();
        updateSigninStatus(true);
    };

    if (!gapi.client || gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}
function handleCredentialResponse(response) {
    // console.log("Google One Tap 返回的 ID Token:", response.credential);

    // 交换 id_token 获取 access_token
    tokenClient.callback = (resp) => {
        if (resp.error) {
            console.error("获取 Access Token 失败:", resp);
            return;
        }
        accessToken = resp.access_token;
        console.log("获取到的 Access Token:", accessToken);
        updateSigninStatus(true);
    };
    tokenClient.requestAccessToken();
    
}

async function createOrGetFolder() {
    const response = await gapi.client.drive.files.list({
        q: `name='${UYP_CHAT_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (response.result.files.length > 0) {
        return response.result.files[0].id; // 已存在
    }

    const folderMetadata = {
        name: UYP_CHAT_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
    };

    const createResponse = await gapi.client.drive.files.create({
        resource: folderMetadata,
        fields: 'id',
    });

    return createResponse.result.id; // 返回新创建的文件夹 ID
}

async function saveToDrive(blob, filename) {
    const folderId = await createOrGetFolder();
    const metadata = {
        name: filename,
        parents: [folderId],
        mimeType: blob.type,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ Authorization: `Bearer ${gapi.client.getToken().access_token}` }),
        body: form,
    });

    return await response.json();
}

async function openFromList() {
    return new Promise(async (resolve, reject) => {
        const folderId = await createOrGetFolder();

        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder'`,
            fields: 'files(id, name, mimeType)',
        });

        if (!response.result.files.length) {
            alert('文件夹内无文件');
            return reject(new Error('文件夹内无文件'));
        }

        // 创建选择框
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = 'white';
        modal.style.padding = '20px';
        modal.style.borderRadius = '5px';
        modal.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.1)';
        modal.innerHTML = '<h3>选择要打开的文件</h3>';

        const fileSelect = document.createElement('select');
        response.result.files.forEach((file) => {
            const option = document.createElement('option');
            option.value = file.id;
            option.textContent = file.name;
            fileSelect.appendChild(option);
        });

        const openButton = document.createElement('button');
        openButton.textContent = '打开';
        openButton.onclick = async () => {
            document.body.removeChild(modal); // 关闭弹框

            const fileId = fileSelect.value;
            try {
                const fileResponse = await gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media',
                });

                
                resolve(fileResponse.body);
            } catch (error) {
                reject(error);
            }
        };



        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.onclick = () => {
            document.body.removeChild(modal);
            reject(new Error('用户取消选择'));
        };

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.onclick = async () => {
            const fileId = fileSelect.value;
            try {
                await gapi.client.drive.files.delete(
                    { fileId: fileId }
                );
                alert('文件已删除');
                // 更新select
                const response = await gapi.client.drive.files.list({
                    q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder'`,
                    fields: 'files(id, name, mimeType)',
                });
                fileSelect.innerHTML = '';
                response.result.files.forEach((file) => {
                    const option = document.createElement('option');
                    option.value = file.id;
                    option.textContent = file.name;
                    fileSelect.appendChild(option);
                });
            } catch (error) {
                reject(error);
            }
        };

        modal.appendChild(fileSelect);
        modal.appendChild(openButton);
        modal.appendChild(cancelButton);
        modal.appendChild(deleteButton);
        document.body.appendChild(modal);
    });
}

async function openFromDrive() {
    return new Promise(async (resolve, reject) => {
        const folderId = await createOrGetFolder();

        const response = await gapi.client.drive.files.list({
                        
                    })

        modal.appendChild(fileSelect);
        modal.appendChild(openButton);
        modal.appendChild(cancelButton);
        document.body.appendChild(modal);
    });
}


    function renderSignedIn() {
        document.getElementById('saveToDrive').disabled = !signedIn;
        document.getElementById('openFromDrive').disabled = !signedIn;
    }

    // 更新登录状态并启用相应按钮
    function updateSigninStatus(isSignedIn) {
      signedIn = isSignedIn;
      renderSignedIn();
    }


    // 以下两个函数是供你在页面上进一步处理 state 或业务逻辑时调用的封装函数

// 保存数据到 Drive：利用 JSZip 把 state（去掉 bearer）打包成 zip 文件
async function saveToGoogleDrive() {
  try {
    // 复制 state 并去掉 bearer 属性
    saveState();
    const exportState = Object.assign({}, state);
    delete exportState.bearer;

    // 利用 JSZip 将 exportState 生成 zip 文件，其中 chat-data.json 存储 JSON 数据
    const zip = new JSZip();
    zip.file("chat-data.json", JSON.stringify(exportState, null, 2));

    const blob = await zip.generateAsync({ type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });

    // 根据 state.title 与当前日期生成文件名
    const title = state.title || 'chat-export';
    const filename = `${title}-${new Date().toLocaleString().replace(/:/g, '-').replace(/ /g, '_')}.zip`;

    // 调用外部定义的 saveToDrive 函数上传文件
    const result = await saveToDrive(blob, filename);
    alert("文件已上传，文件 ID：" + result.id);
  } catch (error) {
    console.error("保存出错：", error);
    alert("保存到 Drive 时出错，请检查控制台日志。");
  }
}

async function openFromGoogleDrive() {
  // 备份当前 state
  const backupState = JSON.parse(JSON.stringify(state));
  try {
    const blob = await openFromList();
    if (blob) {
      // 保留当前的 bearer
      const currentBearer = state.bearer;

      // 加载 zip 文件
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(blob, {binary: true});

      // 读取并解析 chat-data.json 内容
      const fileData = await loadedZip.file("chat-data.json").async("string");
      const newState = JSON.parse(fileData);

      // 恢复之前的 bearer
      newState.bearer = currentBearer;
      state = newState;

      // 更新后执行后续操作
      saveState();
      updateAIHub();
      initializeUI();
      initializeVariables();
    
      alert("状态已成功更新！");
    }
  } catch (error) {
    // 回滚 state
    state = backupState;
    saveState();
    initializeUI();
    initializeVariables();
    
    console.error("打开文件出错：", error);
    alert("打开文件时出错，状态已回滚。请检查控制台日志。");
  }
}