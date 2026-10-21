import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { GovernmentBidRequest, governmentBidFields } from './government-bid.model';

export function createGovernmentBidForm(fb: NonNullableFormBuilder) {
  return fb.group({
    unitId: ['', [Validators.required, Validators.pattern(/\S/)]],
    jobNumber: ['', [Validators.required, Validators.pattern(/\S/)]],
    unitName: '',
    title: '',
    noticeDate: '',
    noticeType: '',
    category: '',
    tenderMethod: '',
    deadline: '',
    openingTime: '',
    openingLocation: '',
    contactName: '',
    contactPhone: '',
    budgetAmount: '',
    bidBondRequired: '',
    performanceLocation: '',
    sourceUrl: '',
  });
}

export function toGovernmentBidRequest(
  value: Record<keyof GovernmentBidRequest, string>,
): GovernmentBidRequest {
  // 依已知欄位建立請求，不把 id、createdAt 等回應欄位送回後端。
  const optional = Object.fromEntries(
    governmentBidFields.map(({ key }) => [key, value[key].trim() || null]),
  );
  return {
    ...optional,
    unitId: value.unitId.trim(),
    jobNumber: value.jobNumber.trim(),
  } as GovernmentBidRequest;
}
