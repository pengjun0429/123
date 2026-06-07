const express = require('express');
const puppeteer = require('puppeteer');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let browser;
let page;
let isPageLoading = false;

// 1. 啟動雲端隱形瀏覽器並開啟 地球 Online
async function initBrowser() {
    console.log("正在啟動雲端瀏覽器...");
    try {
        browser = await puppeteer.launch({
            headless: true, // 在雲端背景隱形執行
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null, // 自動抓取雲端 Chrome 路徑
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1280,720'
            ]
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        console.log("正在前往 地球 Online...");
        await page.goto('https://earthonline.qzz.io', { waitUntil: 'networkidle2' });
        console.log("遊戲網頁已載入，等待用戶連線登入...");

        // 定時將雲端瀏覽器的截圖發送給所有連線的用戶（畫面同步）
        setInterval(async () => {
            if (page && !isPageLoading) {
                try {
                    const screenshot = await page.screenshot({ type: 'jpeg', quality: 60 });
                    const base64Image = screenshot.toString('base64');
                    io.emit('screen-update', base64Image);
                } catch (err) {
                    // 忽略截圖時的短暫錯誤
                }
            }
        }, 200); // 每秒更新約 5 次畫面

    } catch (error) {
        console.error("瀏覽器啟動失敗：", error);
    }
}

// 2. 處理用戶在網域網頁上的操作（滑鼠、鍵盤），並同步給雲端瀏覽器
io.on('connection', (socket) => {
    console.log('用戶已連線至控制台');

    // 處理滑鼠點擊
    socket.on('mouse-click', async (data) => {
        if (page) {
            try {
                await page.mouse.click(data.x, data.y);
            } catch (e) {}
        }
    });

    // 處理鍵盤輸入
    socket.on('keyboard-input', async (data) => {
        if (page) {
            try {
                if (data.key === 'Backspace') {
                    await page.keyboard.press('Backspace');
                } else {
                    await page.keyboard.sendCharacter(data.key);
                }
            } catch (e) {}
        }
    });
});

// 3. 網域主頁面：顯示雲端畫面並接收操作
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>地球 Online 24h 雲端掛機控制台</title>
            <style>
                body { background: #121212; color: white; font-family: Arial; text-align: center; margin: 0; padding: 20px; }
                #canvas-container { position: relative; display: inline-block; border: 2px solid #00ff00; background: #000; }
                img { display: block; max-width: 100%; height: auto; cursor: crosshair; }
                .info { margin-bottom: 15px; color: #888; }
            </style>
            <script src="/socket.io/socket.io.js"></script>
        </head>
        <body>
            <h1>🎮 地球 Online 24h 雲端遠端登入/控制台</h1>
            <p class="info">提示：直接在下方畫面點擊滑鼠或用鍵盤打字，即可操作雲端瀏覽器進行登入。登入後關閉此網頁，雲端仍會繼續掛機。</p>
            
            <div id="canvas-container">
                <img id="screen" src="" alt="等待畫面同步...">
            </div>

            <script>
                const socket = io();
                const screenImg = document.getElementById('screen');

                // 接收雲端畫面並更新
                socket.on('screen-update', (base64) => {
                    screenImg.src = 'data:image/jpeg;base64,' + base64;
                });

                // 監聽點擊事件並回傳座標
                screenImg.addEventListener('click', (e) => {
                    const rect = screenImg.getBoundingClientRect();
                    // 換算回雲端瀏覽器的 1280x720 解析度
                    const x = (e.clientX - rect.left) * (1280 / rect.width);
                    const y = (e.clientY - rect.top) * (720 / rect.height);
                    socket.emit('mouse-click', { x, y });
                });

                // 監聽鍵盤輸入
                window.addEventListener('keydown', (e) => {
                    if(e.key === ' ' || e.key === 'Backspace') e.preventDefault();
                    socket.emit('keyboard-input', { key: e.key });
                });
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(\`控制台伺服器已啟動：http://localhost:\${PORT}\`);
    initBrowser();
});
