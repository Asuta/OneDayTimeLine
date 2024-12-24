const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron')
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