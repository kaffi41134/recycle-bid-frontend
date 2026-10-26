// 對應後端 BidReq / BidRes；空白選填欄位以 null 傳送。
export interface BidRequest {
  bidNo: string;
  contactName: string | null;
  contactPhone: string | null;
  materialCode: string | null;
  itemDescription: string | null;
  quantity: number | null;
  unit: string | null;
  awardAmount: number | null;
  awardDate: string | null;
  pickupLocation: string | null;
  quotationNoticeDate: string | null;
  quotationDeadlineDate: string | null;
  environmentalCode: string | null;
  referenceStorageLocation: string | null;
}

export interface Bid extends BidRequest {
  id: number;
  createdAt: string | null;
}

export interface BidNoticeRequest {
  unitId: string;
  jobNumber: string;
}

export interface BidNotice extends BidNoticeRequest {
  noticeDate: string;
  noticeType: string | null;
  title: string | null;
  filename: string;
}

export interface BidDetailRequest extends BidNoticeRequest {
  noticeDate: string;
  filename: string;
}

export interface BidImportDetail extends BidNoticeRequest {
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
