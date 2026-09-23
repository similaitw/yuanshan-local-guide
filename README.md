# 員山走走

宜蘭縣員山鄉美食、景點、親子農場、咖啡與在地體驗導航網站。

## 功能

- 50 個精選員山地點與分類篩選
- 手機友善搜尋
- Leaflet + OpenStreetMap 互動地圖
- 瀏覽器 Geolocation 定位
- 「離我最近」距離排序
- 親子友善／雨天備案／免費去處／今天可排快速篩選
- Web Share 分享按鈕與 PWA manifest
- 單點 Google Maps 導航
- 親子／自然／吃貨／酒廠多停靠點路線
- OpenStreetMap Overpass 自動補充 POI 座標
- Nominatim 按需補定位，並快取於 localStorage
- 2026-09-23 版資料註記

## 本機預覽

不要直接用 `file://` 開啟，因為瀏覽器定位通常要求 HTTPS 或 localhost。

```bash
python -m http.server 8080
```

然後開啟：

```text
http://localhost:8080
```

## 部署

這是純靜態網站，可直接部署到 Vercel、Netlify、GitHub Pages。

Vercel 不需要 build command；Root Directory 指向這個資料夾即可。

## 重要說明

- 「離我最近」需允許瀏覽器網站定位權限。
- 實際營業時間、門票、公休日、是否需預約，以店家／景點官方最新公告為準。
- 地圖資料使用 OpenStreetMap，部分地點名稱若未被 OSM 收錄，會在使用者點「地圖定位」時用 Nominatim 查詢。

## 資料更新原則

- 官方旅遊資訊優先參考宜蘭縣政府「宜蘭勁好玩」。
- 店家營業時間屬提示性資料；出發前仍建議點 Google Maps 導航後確認最新營業狀態。
- 「今天可排」只依網站整理到的固定休假描述初步排除，不等同即時營業狀態。
