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

## 投標案件管理

從左側「投標案件管理」進入 `/bids`。沿用既有頁面樣式，提供列表、全欄位關鍵字搜尋、
前端分頁、新增／編輯表單與刪除確認視窗。寬表格可左右捲動，操作欄固定於右側。

- `src/app/bids/bids.*`：案件列表、表單、互動與測試。
- `src/app/bids/bid.model.ts`：對應目前後端 `BidReq`／`BidRes`。
- `src/app/bids/bid.service.ts`：串接 `/api/bids` 的 GET、POST、PUT、DELETE。

標售案號依目前後端契約為必填輸入；其餘欄位選填，空白以 null 傳送。
數量允許小數，零保留為零。兩個日期皆填寫時，截止日不得早於通知日；同日允許。
後端目前沒有狀態欄位或自動編號，因此前端沒有加入這兩個功能。
載入錯誤提供重試；新增、修改與刪除只有在 API 成功後才更新畫面，失敗保留資料及輸入。
驗證使用 `npm run build` 與 `npm test -- --watch=false`，HTTP 測試不會修改真實案件。

## 第三方標案公告查詢

在 `/bids` 點選「查詢標案公告」，輸入招標機關代碼與標案案號，呼叫
`POST /api/bids/import/notices`。點選公告列或「帶入明細」，使用該筆回應的
`unitId`、`jobNumber`、`noticeDate` 與 `filename` 呼叫 `POST /api/bids/import/detail`。

`src/app/bids/bid-import/` 為獨立查詢元件，將明細回應的全部 17 個欄位帶入可編輯欄位。
日期、時間與金額保留第三方原始字串，缺漏值呈現空白。切換公告、重新查詢或關閉視窗
會取消尚未完成的請求，避免舊回應覆蓋新資料；查詢與明細失敗均可重試。

確認或編輯明細後，按「儲存政府標案」會呼叫 `POST /api/government-bids`。
儲存成功後關閉視窗並重新載入政府標案列表；失敗保留輸入，儲存期間禁止重送及關閉。
HTTP 模擬測試涵蓋完整欄位帶入、公告識別、取消過期請求、缺值及錯誤重試；
真實第三方整合仍需後端啟動後以有效機關代碼與案號驗證。

## 政府與企業案件

`/bids` 使用「企業案件」與「政府標案」頁籤，兩份資料各自查詢、搜尋及分頁。
企業案件繼續使用 `/api/bids`，政府案件由獨立元件 `src/app/bids/government-bids/` 管理。

| 方法   | 政府案件路徑                | 用途／回應           |
| ------ | --------------------------- | -------------------- |
| GET    | `/api/government-bids`      | 全部案件，200 與陣列 |
| GET    | `/api/government-bids/{id}` | 單筆案件，200 與物件 |
| POST   | `/api/government-bids`      | 新增，200 無 body    |
| PUT    | `/api/government-bids/{id}` | 修改，200 無 body    |
| DELETE | `/api/government-bids/{id}` | 刪除，204 無 body    |

機關代碼、標案案號必填，不接受全空白。17 個公告欄位均可手動輸入或從公告帶入，
選填空白轉成 null；日期、時間與金額不做格式轉換。id、createdAt 不放入請求。
明細、編輯會先查詢單筆最新資料；新增與修改成功後重新查詢列表，不假設 API 回傳案件。
刪除先顯示確認視窗，API 成功才移除列；目前後端為永久刪除。
HTTP 測試使用模擬回應，不會寫入真實資料庫。

## 台塑標案決標欄位與版面

列表與新增／編輯欄位順序為：標售案號、材料編號、品名規格、數量、單位、決標金額、提貨地點、決標日。新增 API 欄位 `awardAmount: number | null`、`awardDate: string | null`；金額非負且最多兩位小數，日期使用 `yyyy-MM-dd`。舊欄位仍隨編輯請求保留。八個業務欄位及操作欄使用固定比例並允許換行，950px 視窗下不需橫向捲動。上方麵包屑與收合按鈕已移除；768px 以上顯示固定側欄，更窄時改為頁面上方導覽。

台塑標案（`/bids`）預設顯示全部決標日期，可使用「全部／今天／昨天／本週／本月」快捷篩選或自訂決標日起迄。快捷日期以 Asia/Taipei 計算，本週為週一至週日、本月包含整月；日期篩選包含起訖當日，可搭配關鍵字。未填決標日的案件只在沒有日期條件時顯示，案件仍依建立時間由新到舊排列。重設會清除日期與關鍵字並回到「全部」。彙總取全部符合條件的案件，不受分頁影響；不同單位的數量分別加總，金額以分為單位加總。截圖模式隱藏側欄、篩選列、操作欄及分頁，展開全部符合條件的明細，可用「返回一般模式」還原。操作欄維持並排文字按鈕。
