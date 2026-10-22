# Frontend AGENTS.md

## 語言

- 一律使用繁體中文回答。
- 解釋程式碼時使用簡單易懂的方式。
- 專有名詞保留英文。

## 開發原則

- 優先使用簡潔、易維護的寫法，避免過度設計或不必要的抽象層。
- 修改程式碼前，先理解現有架構。
- 優先沿用既有元件與工具。
- 不要擅自安裝新的套件。

## Angular 開發規範

- 使用 Angular Standalone Components。
- 優先使用 Signals 管理本地狀態。
- 使用 OnPush Change Detection。
- 優先使用 Angular 新版控制流程。
- 避免使用 any。
- 優先使用 Angular 原生機制，避免不必要的 DOM 操作。

## HTML 與 UI 開發規範

- 本專案為內部使用的後台管理系統。
- UI 設計以簡潔、現代化、操作效率高為優先。
- 優先沿用既有的 UI 元件與設計風格。
- 使用簡潔、語意清楚的 HTML，避免不必要的屬性或 DOM 結構。
- 非必要時不要使用 id 屬性，也不使用 id Selector。
- 下拉選單（select）不使用 label 的 for 與對應的 id 進行關聯；保留顯示文字及 Angular 表單綁定，不額外新增這組屬性。
- 只有在功能確實需要時才使用 id，例如：
  - label 的 for 屬性需要關聯表單欄位。
  - 第三方套件明確要求。
  - 頁面錨點或必要的 ARIA 關聯。
- Angular 元素操作優先使用 Template Reference Variable、
  ViewChild 或資料綁定，不依賴 document.getElementById()。
- 不主動新增無障礙專用功能、樣式或不必要的 ARIA 屬性。
- 不使用 `class="sr-only"` 或新增僅供螢幕閱讀器使用的隱藏內容。
- 保留 HTML 原生語意及基本鍵盤操作能力。
- 樣式優先使用 Tailwind CSS Class，避免不必要的 CSS 檔案或重複樣式。
- 按鈕統一使用 `button button-*` 的 class 組合；共用排列與互動樣式放在 `button`，各類型只保留必要的尺寸、配色及狀態差異，避免重複 CSS。
- 不要為了優化 UI 而擅自改變既有功能、欄位順序或操作流程。

## 修改程式碼時

- 只修改與需求相關的檔案，不要任意重構其他功能。
- 修改完成後，說明修改的檔案與原因。
- 可行時執行相關測試。
