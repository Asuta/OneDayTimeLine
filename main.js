const { app, BrowserWindow, Tray, Menu } = require('electron')
const path = require('path')

let tray = null
let mainWindow = null

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
  // 创建托盘图标
  tray = new Tray(path.join(__dirname, 'build/icon.ico'))
  
  // 创建托盘菜单
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: '显示窗口', 
      click: function() {
        mainWindow.show()
      } 
    },
    { type: 'separator' },
    { 
      label: '退出', 
      click: function() {
        app.isQuiting = true
        app.quit()
      } 
    }
  ])
  
  // 设置托盘提示文字
  tray.setToolTip('时间轴记录')
  
  // 设置托盘菜单
  tray.setContextMenu(contextMenu)
  
  // 改为双击托盘图标显示窗口
  tray.on('double-click', () => {
    mainWindow.show()
  })
}

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