# Electron测试应用

这是一个基于Electron框架开发的桌面应用程序。

## 功能特点

- 跨平台支持（Windows、macOS、Linux）
- 现代化的用户界面
- 可打包为独立的可执行程序

## 开发环境要求

- Node.js (推荐使用最新的LTS版本)
- npm (Node.js包管理器)

## 安装

1. 克隆项目到本地：
```bash
git clone [项目地址]
cd TimeLinePeoject
```

2. 安装依赖：
```bash
npm install
```

## 开发运行

启动开发服务器：
```bash
npm start
```

## 构建

### Windows版本
```bash
npm run build:win
```

### macOS版本
```bash
npm run build:mac
```

### Linux版本
```bash
npm run build:linux
```

构建后的文件将保存在 `dist` 目录中。

## 项目结构

```
TimeLinePeoject/
├── main.js          # 主进程文件
├── renderer.js      # 渲染进程文件
├── index.html       # 主页面
├── styles.css       # 样式文件
├── build/           # 构建资源目录
└── dist/           # 构建输出目录
```

## 技术栈

- Electron
- HTML/CSS/JavaScript
- electron-builder (用于打包)

## 许可证

ISC 