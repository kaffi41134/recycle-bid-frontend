# 回收品項管理

## 啟動

在 `recycle-bid-frontend` 目錄執行 `npm start`，開啟 http://localhost:4200。
開發伺服器會依 `proxy.conf.json` 將 `/api/**` 轉送到 http://localhost:8080。

後端已加入 H2 runtime 依賴及 `application.yml`，依其中的 datasource 設定連線。
於 `recycle-bid-backend` 使用 Java 21 執行 `./mvnw.cmd spring-boot:run`。
H2 的 `jdbc:h2:mem:` 資料會在後端停止後消失，`jdbc:h2:file:` 則保存於檔案。
若後端尚未啟動，前端會顯示連線失敗提示；不會自動建立範例資料。

## 程式位置

- `src/app/app.*`：左側選單與上方導覽列。
- `src/app/materials/materials.*`：品項列表、查詢、分頁與新增／編輯／刪除視窗。
- `src/app/materials/material.service.ts`：使用 HttpClient 呼叫後端。
- `src/app/materials/material.model.ts`：對應 API 的型別。
- `src/styles.css`：Tailwind 共用樣式。
- `public/images/material-header.png`：使用者提供的標題背景。

元件採用 standalone、Signals、`@if`／`@for` 與標準 Reactive Forms。
HTTP 使用 Observable 訂閱來處理回應與錯誤；元件銷毀時會取消請求。
目前 GET 回傳全部品項，搜尋與分頁在前端處理，適合初期的小型列表。
其餘左側選單、通知圖示及使用者資訊目前為版面展示。

## API

| 方法   | 路徑                  | 用途／回應            |
| ------ | --------------------- | --------------------- |
| GET    | `/api/materials`      | 品項陣列，200         |
| GET    | `/api/materials/{id}` | 單筆品項，200         |
| POST   | `/api/materials`      | 新增，201 與 Location |
| PUT    | `/api/materials/{id}` | 修改，200             |
| DELETE | `/api/materials/{id}` | 刪除，204             |

新增／修改 body：

```json
{ "name": "廢紅銅", "category": "金屬類", "unit": "KG", "enabled": true }
```

回應包含 `id`、`code`、`name`、`category`、`unit`、`enabled`、`createdAt`。
`code` 與 `createdAt` 由後端產生，不放在新增或修改的 request。
分類為金屬類、紙類、塑膠類與玻璃類；驗證錯誤為 400，現有商業邏輯錯誤為 422。

## 建立時間與資料庫

`Material.createdAt` 使用 Hibernate `@CreationTimestamp`，新增資料時自動寫入，
`updatable = false` 避免修改時重寫。建立時間使用伺服器的本地時間，
前端顯示 `yyyy-MM-dd HH:mm`，空值顯示「—」。

若資料表已存在，需新增對應的 `created_at` 日期時間欄位。
若採用自訂命名策略，欄位名稱請以實際 Hibernate mapping 為準。
舊資料應先依可取得的歷史紀錄補值，再套用 NOT NULL；不要把當前時間當成真實建立時間。
實際 DDL 需依使用的資料庫調整。

## 驗證

前端：`npm run build`、`npm test -- --watch=false`。
後端：在 `recycle-bid-backend` 使用 Java 21 執行：

```powershell
./mvnw.cmd test
```

Controller 測試使用 MockMvc 與模擬 Service；時間測試驗證 DTO 映射及修改時保留原值。
`MaterialPersistenceTests` 使用獨立 H2 記憶體資料庫驗證 Hibernate 自動產生時間。
