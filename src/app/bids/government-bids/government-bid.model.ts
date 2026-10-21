// 對應 GovernmentBidReq；日期、時間與金額保留來源文字。
export interface GovernmentBidRequest {
  unitId: string;
  jobNumber: string;
  unitName: string | null;
  title: string | null;
  noticeDate: string | null;
  noticeType: string | null;
  category: string | null;
  tenderMethod: string | null;
  deadline: string | null;
  openingTime: string | null;
  openingLocation: string | null;
  contactName: string | null;
  contactPhone: string | null;
  budgetAmount: string | null;
  bidBondRequired: string | null;
  performanceLocation: string | null;
  sourceUrl: string | null;
}

export interface GovernmentBid extends GovernmentBidRequest {
  id: number;
  createdAt: string | null;
}

export const governmentBidFields = [
  { key: 'unitId', label: '招標機關代碼' },
  { key: 'jobNumber', label: '標案案號' },
  { key: 'unitName', label: '招標機關名稱' },
  { key: 'title', label: '標案名稱' },
  { key: 'noticeDate', label: '公告日期' },
  { key: 'noticeType', label: '公告類型' },
  { key: 'category', label: '標的分類' },
  { key: 'tenderMethod', label: '招標方式' },
  { key: 'deadline', label: '截止投標時間' },
  { key: 'openingTime', label: '開標時間' },
  { key: 'openingLocation', label: '開標地點' },
  { key: 'contactName', label: '機關聯絡人' },
  { key: 'contactPhone', label: '機關聯絡電話' },
  { key: 'budgetAmount', label: '預算金額' },
  { key: 'bidBondRequired', label: '是否須繳納押標金' },
  { key: 'performanceLocation', label: '履約地點' },
  { key: 'sourceUrl', label: '政府標案公告網址' },
] as const satisfies readonly { key: keyof GovernmentBidRequest; label: string }[];
