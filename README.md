# ChatAI-HTML

这是一个轻量级的本地聊天界面实现，完全基于HTML/JavaScript运行，无需服务器。设计用于与各类AI聊天接口集成，支持变量、模板和上下文管理。

Github Pages [在线地址](https://rgss3.github.io/ChatAI-HTML)

## 主要功能

- 💬 纯前端聊天界面，完全本地运行
- 📝 支持Markdown渲染
- 🔄 内置模板系统和变量管理
- 📦 聊天记录导入导出
- 📋 完整的上下文管理
- 🎨 支持自定义消息处理器
- 📱 响应式设计，支持移动端

## 快速开始

1. 下载项目文件
2. 在浏览器中打开`index.html`
3. 开始使用！

## 模板系统

支持以下模板语法：
- `{{context}}` - 获取全部上下文（不限制数量）
- `{{input}}` - 获取用户输入框的内容
- `{{var:xxx}}` - 获取变量`xxx`的值（如`{{var:summary_result}}`）
- `{{context:N}}` - 获取最近N个字符的上下文
- `{{js|code|}}` - 执行JavaScript代码
- 更多自定义模板处理器

## 新增功能

### a. Google Drive 支持  
现在支持从Google Drive保存和读取聊天记录。浏览器原本会保存本地记录，但清空缓存后数据会丢失。通过Google Drive，您可以持久化保存聊天记录，避免数据丢失。  

**注意**：由于Google的CORS策略限制，此功能无法在`file:///`开头的本地地址中使用（暂不支持手动授权）。您可以直接使用本项目提供的 [GitHub Pages](https://rgss3.github.io/ChatAI-HTML)，或者自行搭建一个HTTPS服务器来启用此功能。

### b. 手动输入输出与上下文压缩
如果API端点设置为`"manual"`，您可以手动输入和输出聊天内容。同时，提供了一个简单的上下文压缩接口，默认设置为Kobold的`http://localhost:5001`。您可以将请求手动复制到Poe或其他非API端点使用。

### c. 文本格式导入导出
支持导入和导出文本格式的聊天记录，方便您在不同平台或设备之间迁移数据。

## 自定义集成

您可以通过覆盖`callAPI.js`文件来实现自定义集成。例如，当前的`manual`模式就是通过覆盖`callAPI.js`来实现的。

## 变量管理

变量管理提供了四个操作按钮：

- **➕ Add**: 增加变量
- **▶️ Execute**: 执行变量，将变量的内容按预处理方式替换并输出到控制台（包含的JavaScript代码也会执行）
- **🔄 Update**: 更新变量。以`summary`为例，无论是对`summary`还是`summary_result`运行更新功能，都会将`summary`的内容预处理之后作为AI提示，并将输出更新到`summary_result`中。
- **🗑️ Remove**: 删除变量

## 许可证

本项目采用[GNU通用公共许可证v3.0](https://www.gnu.org/licenses/gpl-3.0.html)进行许可。

## 免责声明

本项目仅提供技术框架，不包含任何AI模型或API。使用者需要自行确保：
1. 遵守相关AI服务的使用条款
2. 保护用户隐私和数据安全
3. 遵守相关法律法规

## 贡献

欢迎提交Issue和Pull Request！

## 技术栈

- 纯HTML/CSS/JavaScript
- Marked.js用于Markdown渲染
- 无其他外部依赖

## 待办事项

- [ ] **更完善的自定义工作流**：支持在一条消息上实现预压缩、后压缩、提取、设置、RAG等完全自定义操作。
- [ ] **支持Automatic1111接口画图**：集成Automatic1111的API，支持通过聊天界面生成图像。
- [ ] **支持多模态输入**：至少包括文件和图片的输入支持。

## 致谢

- Claude 3.5 Sonnet (Anthropic) - 协助开发
- Marked.js - Markdown渲染支持

---

项目作者 RGSS3(Rabix)
项目基于GPL v3协议发布
Copyright © 2025 RGSS3(Rabix)
