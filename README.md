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

## 自定义集成

你可以通过修改`sendMessage`函数来集成任何AI接口：

```javascript
async function sendMessage(message) {
    // 在这里实现与AI接口的通信
    // 返回AI的响应内容
    return "AI的回复";
}
```

## 模板系统

支持以下模板语法：
- `{{context:N}}` - 获取最近N个字符的上下文
- `{{js|code}}` - 执行JavaScript代码
- 更多自定义模板处理器

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

- [ ] 支持更多自定义主题
- [ ] 增加插件系统
- [ ] 添加更多预设模板
- [ ] 优化移动端体验

## 致谢

- Claude 3.5 Sonnet (Anthropic) - 协助开发
- Marked.js - Markdown渲染支持

---

项目作者 RGSS3(Rabix)
项目基于GPL v3协议发布
Copyright © 2025 RGSS3(Rabix)
