const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

let browser = null;
let page = null;
let gameStatus = "尚未啟動掛機。請點擊下方按鈕開始！";

// 啟動雲端掛機瀏覽器的函式
async function startHook() {
    if (browser) {
        gameStatus = "地球 Online 已經在後台 24h 掛機中，請勿重複啟動！";
        return;
    }
    
    gameStatus = "正在雲端啟動瀏覽器，請稍候...";
    console.log(gameStatus);
    
    try {
        browser = await puppeteer.launch({
            headless: true, // 在背景執行
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log("正在前往 地球 Online...");
        await page.goto('https://earthonline.qzz.io', { waitUntil: 'domcontentloaded', timeout: 0 });
        
        gameStatus = "🎮 遊戲已成功載入！現在請直接去官方網站登入，這台雲端主機會 24h 幫你維持連線狀態！";
        console.log(gameStatus);
    } catch (error) {
        gameStatus = "啟動失敗: " + error.message;
        console.error(error);
        browser = null;
    }
}

// 網域主頁面
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>地球 Online 24h 雲端掛機免卡頓控制台</title>
            <style>
                body { background: #121212; color: white; font-family: Arial; text-align: center; padding-top: 50px; }
                .btn { background: #00ff00; color: black; border: none; padding: 15px 30px; font-size: 18px; font-weight: bold; cursor: pointer; border-radius: 5px; margin: 20px; }
                .btn:hover { background: #00cc00; }
                .status { font-size: 20px; color: #00ffff; margin: 20px; }
                a { color: #ff00ff; font-size: 18px; text-decoration: none; }
            </style>
        </head>
        <body>
            <h1>🎮 地球 Online 24h 雲端掛機系統 (免同步版)</h1>
            <p class="status">目前雲端狀態：${gameStatus}</p>
            
            <form action="/start" method="POST">
                <button class="btn" type="submit">🚀 點我：讓雲端主機開著遊戲網頁</button>
            </form>
            
            <br><br>
            <p>💡 使用說明：點擊上方按鈕後，雲端就會 24h 幫你咬住遊戲網站。接著你可以直接點下方連結去登入遊戲：</p>
            <a href="https://earthonline.qzz.io" target="_blank">👉 點我打開官方遊戲網頁進行登入/掛機 👈</a>
        </body>
        </html>
    `);
});

// 處理按鈕點擊
app.post('/start', async (req, res) => {
    startHook(); // 在背景啟動，不卡住網頁反應
    res.send(`
        <script>
            alert('雲端瀏覽器啟動指令已送出！請等待大約 10 秒後，返回首頁重新整理查看狀態。');
            window.location.href = '/';
        </script>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("免卡頓控制台伺服器已啟動");
});
