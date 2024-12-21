# 每日时间记录应用

这是一个基于Electron框架开发的桌面应用程序，用于可视化记录和管理每日时间安排。它提供了直观的时间轴视图，帮助用户更好地规划和追踪每天的时间分配。

## 功能特点

- 可视化时间轴展示：以24小时制展示每日时间安排
- 灵活的事件管理：
  - 添加带有时间段的事件
  - 自定义事件颜色
  - 事件时间冲突检测
  - 删除已创建的事件
- 交互式时间轴：
  - 支持鼠标滚轮缩放时间轴视图（按住Ctrl键）
  - 动态调整时间刻度显示
- 数据持久化：自动保存事件数据到本地存储
- 双视图展示：
  - 时间轴可视化视图
  - 列表式事件管理视图

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