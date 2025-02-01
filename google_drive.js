 // 加载 gapi 客户端
    function initClient() {
      return gapi.client.init({
        apiKey: GOOGLE_API_CONFIG.apiKey,
        clientId: GOOGLE_API_CONFIG.clientId,
        scope: GOOGLE_API_CONFIG.scope,
        discoveryDocs: GOOGLE_API_CONFIG.discoveryDocs,
      }).then(() => {
        // 注册登录状态变化监听
        const GoogleAuth = gapi.auth2.getAuthInstance();
        updateSigninStatus(GoogleAuth.isSignedIn.get());
        GoogleAuth.isSignedIn.listen(updateSigninStatus);
      }, (error) => {
        console.error('gapi.client.init 失败：', error);
      });
    }

    // 更新登录状态并启用相应按钮
    function updateSigninStatus(isSignedIn) {
      document.getElementById('saveToDrive').disabled = !isSignedIn;
      document.getElementById('openFromDrive').disabled = !isSignedIn;
    }

    // 处理用户点击登录按钮
    function handleAuthClick() {
      const GoogleAuth = gapi.auth2.getAuthInstance();
      GoogleAuth.signIn();
    }

    // GSI 的回调函数，当 Google 返回凭据时调用
    function handleCredentialResponse(response) {
      console.log("收到凭据：", response);
      // 这里可根据需要解析 JWT 并自动调用 gapi.client.init
      // 如果 gapi.client 还未加载完成，则加载 gapi.client后再初始化
      gapi.load('client:auth2', initClient);
    }

    // 辅助函数：检查目标文件夹是否存在，如果不存在则创建它，返回文件夹的 ID
    async function ensureFolderExists(folderName) {
      try {
        const response = await gapi.client.drive.files.list({
          q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
          fields: 'files(id, name)',
          spaces: 'drive'
        });
        if (response.result.files && response.result.files.length > 0) {
          return response.result.files[0].id;
        } else {
          // 不存在则创建文件夹
          const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          };
          const createResponse = await gapi.client.drive.files.create({
            resource: fileMetadata,
            fields: 'id'
          });
          return createResponse.result.id;
        }
      } catch (error) {
        console.error('ensureFolderExists 出错：', error);
        throw error;
      }
    }

    // 用于保存文件到 Google Drive 的函数
    async function saveToDrive(blob, filename) {
      try {
        // 先确保目标文件夹存在
        const folderId = await ensureFolderExists(UYP_CHAT_FOLDER_NAME);

        // 构造文件元数据，放置到目标文件夹中
        const metadata = {
          name: filename,
          parents: [folderId]
        };

        // 使用 FormData 构造 multipart 请求
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        // 获取当前用户的 access token
        const accessToken = gapi.auth.getToken().access_token;

        // 发起上传请求（multipart 上传方式）
        const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST',
          headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
          body: form
        });

        if (!uploadResponse.ok) {
          throw new Error('文件上传失败，状态码：' + uploadResponse.status);
        }
        const result = await uploadResponse.json();
        console.log('文件上传成功：', result);
        return result;
      } catch (error) {
        console.error('saveToDrive 出错：', error);
        throw error;
      }
    }

    // 用于从指定文件夹中列出第一批文件并选择一个返回 Blob 的函数
    async function openFromList() {
      try {
        // 获取指定文件夹 ID
        const folderId = await ensureFolderExists(UYP_CHAT_FOLDER_NAME);
        // 列出文件夹内的文件（只取第一页，最大 10 个文件）
        const response = await gapi.client.drive.files.list({
          q: `'${folderId}' in parents and trashed = false`,
          fields: 'files(id, name)',
          pageSize: 10,
          spaces: 'drive'
        });
        const files = response.result.files;
        if (!files || files.length === 0) {
          alert("没有找到文件。");
          return null;
        }
        // 以简单方式提示用户选择（可以自行替换为更好的 UI 实现）
        const listStr = files.map((f, index) => `${index + 1}: ${f.name}`).join("\n");
        const choice = prompt("请选择文件（输入序号）：\n" + listStr);
        const index = parseInt(choice, 10) - 1;
        if (isNaN(index) || index < 0 || index >= files.length) {
          alert("选择无效！");
          return null;
        }
        const fileId = files[index].id;

        // 使用 fetch 下载文件内容（alt=media）
        const accessToken = gapi.auth.getToken().access_token;
        const mediaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        if (!mediaResponse.ok) {
          throw new Error('下载文件失败，状态码：' + mediaResponse.status);
        }
        const blob = await mediaResponse.blob();
        return blob;
      } catch (error) {
        console.error('openFromList 出错：', error);
        return null;
      }
    }

    // 以下两个函数是供你在页面上进一步处理 state 或业务逻辑时调用的封装函数

// 保存数据到 Drive：利用 JSZip 把 window.state（去掉 bearer）打包成 zip 文件
async function saveToGoogleDrive() {
  try {
    // 复制 window.state 并去掉 bearer 属性
    saveState();
    const exportState = Object.assign({}, window.state);
    delete exportState.bearer;

    // 利用 JSZip 将 exportState 生成 zip 文件，其中 chat-data.json 存储 JSON 数据
    const zip = new JSZip();
    zip.file("chat-data.json", JSON.stringify(exportState, null, 2));

    const blob = await zip.generateAsync({ type: "blob" });

    // 根据 state.title 与当前日期生成文件名
    const title = window.state.title || 'chat-export';
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
  const backupState = JSON.parse(JSON.stringify(window.state));
  try {
    const blob = await openFromList();
    if (blob) {
      // 保留当前的 bearer
      const currentBearer = window.state.bearer;

      // 加载 zip 文件
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(blob);

      // 读取并解析 chat-data.json 内容
      const fileData = await loadedZip.file("chat-data.json").async("string");
      const newState = JSON.parse(fileData);

      // 恢复之前的 bearer
      newState.bearer = currentBearer;
      window.state = newState;

      // 更新后执行后续操作
      saveState();
      initializeUI();
      initializeVariables();

      alert("状态已成功更新！");
    }
  } catch (error) {
    // 回滚 state
    window.state = backupState;
    saveState();
    initializeUI();
    initializeVariables();
    console.error("打开文件出错：", error);
    alert("打开文件时出错，状态已回滚。请检查控制台日志。");
  }
}
