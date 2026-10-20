import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Bid,
  BidRequest,
  BidNoticeRequest,
  BidNotice,
  BidDetailRequest,
  BidImportDetail,
} from './bid.model';

@Injectable({ providedIn: 'root' })
export class BidService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/bids';

  findNotices(request: BidNoticeRequest) {
    return this.http.post<BidNotice[]>(`${this.url}/import/notices`, request);
  }

  findNoticeDetail(request: BidDetailRequest) {
    return this.http.post<BidImportDetail>(`${this.url}/import/detail`, request);
  }

  findAll() {
    return this.http.get<Bid[]>(this.url);
  }

  findById(id: number) {
    return this.http.get<Bid>(`${this.url}/${id}`);
  }

  create(request: BidRequest) {
    return this.http.post<Bid>(this.url, request);
  }

  update(id: number, request: BidRequest) {
    return this.http.put<Bid>(`${this.url}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
