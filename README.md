# MyGPT

一个类 ChatGPT / Kimi / 豆包的轻量级 AI 智能助手 Web 应用，支持 OpenAI 兼容接口、流式对话、多会话管理，以及图片、文本和常见办公文档的附件理解。

## Features

- AI 对话：通过 OpenAI-compatible Chat Completions API 调用大语言模型。
- 流式响应：基于 Server-Sent Events 实时输出模型回复。
- 多会话管理：支持新建、切换、重命名、删除和清空会话。
- 本地历史记录：会话数据保存在浏览器 `localStorage` 中。
- 附件输入：支持图片、文本文件、PDF、Word、Excel 和 PowerPoint。
- 文件解析：服务端解析文档内容，并自动截断超长文本以控制上下文长度。
- 简洁 WebUI：React + Vite 构建，适合本地运行和二次开发。

## Tech Stack

- Frontend: React, Vite
- Backend: Node.js, Express
- File parsing: `pdf-parse`, `mammoth`, `xlsx`, `jszip`
- API: OpenAI-compatible `/chat/completions`

## Getting Started

### Prerequisites

- Node.js >= 20.19.0
- npm
- 一个兼容 OpenAI API 格式的模型服务和 API Key

### Installation

```bash
npm run install:all
```

### Configuration

复制环境变量示例文件：

```bash
cp .env.example .env
```

然后按实际模型服务修改 `.env`：

```env
API_BASE_URL=https://api.openai.com/v1
API_KEY=your-api-key-here
MODEL_NAME=gpt-4o
```

如果使用其他 OpenAI-compatible 服务，只需要替换 `API_BASE_URL`、`API_KEY` 和 `MODEL_NAME`。

### Development

```bash
npm run dev
```

默认服务地址：

- Web App: `http://localhost:5173`
- API Server: `http://localhost:3001`

也可以使用脚本启动：

```bash
./start.sh
```

停止服务：

```bash
./stop.sh
```

## Project Structure

```text
.
├── client/          # React frontend
├── server/          # Express API server
├── .env.example     # Environment variable example
├── start.sh         # macOS/Linux start script
├── stop.sh          # macOS/Linux stop script
└── package.json     # Workspace scripts
```

## API Endpoints

- `POST /api/chat` forwards messages to the configured model API and streams the response.
- `POST /api/parse-file` parses uploaded documents and returns extracted text.

## Description

MyGPT is a lightweight AI assistant web app with OpenAI-compatible streaming chat, local conversation history, and multimodal file attachments.
