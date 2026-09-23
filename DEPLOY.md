# 部署說明

本專案是純靜態網站，無需 build command。

## Vercel

1. 將 repository 匯入 Vercel。
2. Framework Preset 選 Other。
3. Root Directory 使用 repository 根目錄。
4. Build Command 留空。
5. Output Directory 留空。
6. Deploy。

定位功能需要 HTTPS；Vercel 正式網址符合此條件。

## 維護前檢查

```bash
npm test
```

若顯示 `PASS`，代表地點資料、分類、路線引用與主要 UI 元件通過基本資料完整性檢查。
