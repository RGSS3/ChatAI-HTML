# ChatAI-HTML

一个轻量级的本地聊天界面实现。支持经典对话模式和命令行模式,完全基于HTML/JavaScript运行,无需服务器。设计用于与各类AI聊天接口集成。

[在线预览](https://rgss3.github.io/ChatAI-HTML)

## 主要特性

### 基础功能
- 💬 纯前端聊天界面,完全本地运行
- 📝 支持Markdown渲染
- 🔄 内置模板系统和变量管理
- 📦 聊天记录导入导出
- 📱 响应式设计,移动端友好

### 进阶功能
- 🤖 双模式切换:经典聊天模式/命令行模式
- 📋 完整的上下文管理系统
- 💾 Memory Box: 命令行模式下的角色存储
- 🎨 自定义消息处理器
- ⚙️ AI管理器与密钥管理分离

## 界面模式

### 经典模式
- 类似 Poe/SillyTavern 的传统对话界面
- 支持富文本显示和Markdown渲染
- 直观的消息流展示

### 命令行模式 (Term)
- 通过底部Term按钮切换
- 精简的命令行式交互
- 集成Memory Box功能
  - 支持角色卡片导入
  - 手动上下文管理
  - 灵活的内容过滤系统

## 核心系统

### AI管理器
- 支持多AI端点配置
- 变量处理/消息压缩/对话分别配置
- 集成手动输入功能

### 密钥管理器
- 独立的密钥存储系统
- AI配置与密钥分离
- 安全的导入导出机制

### 模板系统
- `{{context}}` - 获取全部上下文
- `{{input}}` - 获取用户输入
- `{{var:xxx}}` - 获取变量值
- `{{context:N}}` - 获取最近N字符上下文
- `{{js|code|}}` - 执行JavaScript代码

## 数据同步

### Google Drive集成
- 云端保存聊天记录
- 跨设备数据同步
- 需要HTTPS环境

### 本地数据
- 支持文本格式导入导出
- 聊天记录本地持久化
- 配置数据备份还原

## 开发计划

- [ ] 自定义工作流增强
- [ ] Automatic1111 API集成
- [ ] 多模态输入支持
- [ ] Memory Box功能增强

## 技术栈

- HTML/CSS/JavaScript
- Marked.js (Markdown渲染)
- JSZip (数据打包)

## 许可与声明

基于[GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.html)协议开源。
使用者需自行确保遵守相关服务条款及法律法规。

## 致谢

- Claude 3.5 Sonnet - 系统架构设计与重构
- Gemini 2 Flash - 前端交互优化
- Marked.js - Markdown渲染支持
- xterm.js - 终端模拟支持
- JSZip - 数据处理支持

---

项目作者: RGSS3(Rabix)  
Copyright © 2025 RGSS3(Rabix)  
基于GPL v3协议发布
