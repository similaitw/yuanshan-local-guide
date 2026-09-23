# 員山走走

宜蘭縣員山鄉美食、景點與親子去處地圖。首頁採 Google Maps + 地點列表雙欄，並內建建議行程選單與自訂多站路線規劃。

## 主要功能

- Google Maps 首頁多點地圖
- 右側同步地點列表
- 使用瀏覽器定位後依「離我最近」排序
- 建議行程改為下拉選單
- 任意地點加入「我的路線」
- 路線停靠點可調整順序、刪除、清空
- 一鍵用 Google Maps 開啟多站 Directions
- 親子／雨天／免費與類別篩選
- 50 個員山精選地點、4 條建議行程

## Google Maps API Key

首頁地圖使用 **Google Maps JavaScript API**，需要 Browser API Key。

1. 在 Google Cloud Console 啟用 Maps JavaScript API。
2. 建立 API key。
3. 強烈建議把 Application restrictions 設為 **Websites (HTTP referrers)**。
4. 將正式網域加入允許清單，例如：
   - `https://yuanshan-local-guide.vercel.app/*`
   - 自訂網域 `https://你的網域/*`
5. 編輯 `maps-config.js`：

```js
window.GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
```

> Google Maps 瀏覽器 key 本來就會出現在前端，安全重點是限制 API 與 HTTP referrer，不是把 key 當成伺服器密碼隱藏。

## 路線規劃

路線規劃使用 Google Maps URLs `https://www.google.com/maps/dir/?api=1`，不需要額外的 Directions API key。手機瀏覽器支援的中途點數量較少，因此目前網站最多送出 5 個停靠點。

## 本機檢查

```bash
npm test
node --check app.js
python -m http.server 8080
```

然後開啟 `http://localhost:8080`。
