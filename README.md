# 員山走走

宜蘭縣員山鄉美食、景點與親子去處地圖。

## 地圖架構

本專案比照 `similaitw/nccu-eats`，**不使用 Google Maps JavaScript API，也不需要 API key**。

- 首頁地圖：`https://maps.google.com/maps?q=...&output=embed` iframe
- 單點開啟：Google Maps Search URL
- 多站路線：Google Maps Directions URL
- 使用者定位：瀏覽器 Geolocation API
- 距離排序：定位後用網站快取的座標計算

## 主要功能

- 首頁 Google 地圖 + 地點列表雙欄
- 點列表「地圖」立即切換地圖顯示地點
- 地圖上方可用下拉選單換地點
- 使用目前位置後可依距離排序
- 建議行程使用下拉選單
- 任意地點加入「我的路線」
- 停靠點可調整順序、刪除、清空
- 一鍵開啟 Google Maps 多站導航
- 親子／雨天／免費與類別篩選
- 50 個員山精選地點、4 條建議行程

## 本機預覽

```bash
python -m http.server 8080
```

開啟 `http://localhost:8080`。

## 檢查

```bash
npm test
node --check app.js
```

## 部署

純靜態網站，GitHub `main` 已連到 Vercel，push 後會自動 production deploy。
