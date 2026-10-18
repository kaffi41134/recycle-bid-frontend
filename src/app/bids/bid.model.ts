// 對應後端 BidReq / BidRes；空白選填欄位以 null 傳送。
export interface BidRequest {
  bidNo: string;
  contactName: string | null;
  contactPhone: string | null;
  materialCode: string | null;
  itemDescription: string | null;
  quantity: number | null;
  unit: string | null;
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
