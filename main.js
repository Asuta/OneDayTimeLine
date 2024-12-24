const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
require('@electron/remote/main').initialize()

let tray = null
let mainWindow = null

// 添加日志处理
ipcMain.on('log-message', (event, { message, data }) => {
    console.log(message, data);
});

// 检查是否为第一个实例
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    // 当运行第二个实例时，将焦点放在第一个实例的窗口上
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
        }
    })

    function createWindow () {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 1000,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })

        require('@electron/remote/main').enable(mainWindow.webContents)
        
        mainWindow.loadFile('index.html')

        // 当点击关闭按钮时触发close事件
        mainWindow.on('close', function (event) {
            if(!app.isQuiting){
                event.preventDefault()
                mainWindow.hide()
            }
            return false
        })

        // 创建应用程序菜单
        const template = [
            {
                label: '文件',
                submenu: [
                    {
                        label: '导入数据',
                        click: async () => {
                            const result = await dialog.showOpenDialog(mainWindow, {
                                properties: ['openFile'],
                                filters: [
                                    { name: 'JSON Files', extensions: ['json'] }
                                ]
                            });
                            if (!result.canceled) {
                                mainWindow.webContents.send('import-data', result.filePaths[0]);
                            }
                        }
                    },
                    {
                        label: '导出数据',
                        click: async () => {
                            const result = await dialog.showSaveDialog(mainWindow, {
                                defaultPath: path.join(app.getPath('documents'), 'events.json'),
                                filters: [
                                    { name: 'JSON Files', extensions: ['json'] }
                                ]
                            });
                            if (!result.canceled) {
                                mainWindow.webContents.send('export-data', result.filePath);
                            }
                        }
                    },
                    { type: 'separator' },
                    {
                        label: '退出',
                        click: () => {
                            app.isQuiting = true;
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: '编辑',
                submenu: [
                    { role: 'undo', label: '撤销' },
                    { role: 'redo', label: '重做' },
                    { type: 'separator' },
                    { role: 'cut', label: '剪切' },
                    { role: 'copy', label: '复制' },
                    { role: 'paste', label: '粘贴' },
                    { role: 'delete', label: '删除' },
                    { type: 'separator' },
                    { role: 'selectAll', label: '全选' }
                ]
            },
            {
                label: '视图',
                submenu: [
                    { role: 'reload', label: '重新加载' },
                    { role: 'forceReload', label: '强制重新加载' },
                    { role: 'toggleDevTools', label: '开发者工具' },
                    { type: 'separator' },
                    { role: 'resetZoom', label: '实际大小' },
                    { role: 'zoomIn', label: '放大' },
                    { role: 'zoomOut', label: '缩小' },
                    { type: 'separator' },
                    { role: 'togglefullscreen', label: '切换全屏' }
                ]
            },
            {
                label: '设置',
                submenu: [
                    {
                        label: '数据存储位置',
                        click: async () => {
                            const result = await dialog.showOpenDialog(mainWindow, {
                                properties: ['openDirectory']
                            });
                            if (!result.canceled) {
                                mainWindow.webContents.send('set-storage-path', result.filePaths[0]);
                            }
                        }
                    }
                ]
            },
            {
                label: '帮助',
                submenu: [
                    {
                        label: '关于',
                        click: async () => {
                            const options = {
                                type: 'info',
                                buttons: ['确定'],
                                title: '关于',
                                message: '时间轴记录应用',
                                detail: '版本 1.0.0\n一个用于记录和管理每日时间安排的应用程序。'
                            };
                            await dialog.showMessageBox(mainWindow, options);
                        }
                    }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    function createTray() {
        try {
            // 如果托盘已经存在，不要重复创建
            if (tray) return;

            // 尝试多个可能的图标路径
            const iconPath = path.join(__dirname, 'build', 'icon.ico')
            const alternativeIconPath = path.join(__dirname, 'icon.ico')
            const defaultIconPath = path.join(__dirname, 'assets', 'icon.ico')
            
            let trayIcon = iconPath
            if (!require('fs').existsSync(iconPath)) {
                if (require('fs').existsSync(alternativeIconPath)) {
                    trayIcon = alternativeIconPath
                } else if (require('fs').existsSync(defaultIconPath)) {
                    trayIcon = defaultIconPath
                }
            }
            
            // 创建托盘图标
            tray = new Tray(trayIcon)
            
            // 创建托盘菜单
            const contextMenu = Menu.buildFromTemplate([
                { 
                    label: '显示主窗口', 
                    click: () => {
                        mainWindow.show()
                    } 
                },
                { type: 'separator' },
                { 
                    label: '退出', 
                    click: () => {
                        app.isQuiting = true
                        app.quit()
                    } 
                }
            ])
            
            // 设置托盘提示文字
            tray.setToolTip('时间轴记录')
            
            // 设置托盘菜单
            tray.setContextMenu(contextMenu)
            
            // 双击托盘图标显示窗口
            tray.on('double-click', () => {
                mainWindow.show()
            })

            // 单击托盘图标显示/隐藏窗口
            tray.on('click', () => {
                if (mainWindow.isVisible()) {
                    mainWindow.hide()
                } else {
                    mainWindow.show()
                }
            })
        } catch (error) {
            console.error('创建托盘图标失败:', error)
        }
    }

    // 确保应用程序准备就绪后再创建窗口和托盘
    app.whenReady().then(() => {
        createWindow()
        createTray()

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow()
            }
        })
    })

    // 修改窗口全部关闭时的行为
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
} 