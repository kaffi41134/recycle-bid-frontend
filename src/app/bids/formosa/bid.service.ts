import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Bid, BidRequest } from './bid.model';

@Injectable({ providedIn: 'root' })
export class BidService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/bids';

  findAll(keyword = '', awardDateFrom = '', awardDateTo = '') {
    const params = this.buildSearchParams(keyword, awardDateFrom, awardDateTo);

    return this.http.get<Bid[]>(this.url, { params });
  }

  exportExcel(keyword = '', awardDateFrom = '', awardDateTo = '') {
    const params = this.buildSearchParams(keyword, awardDateFrom, awardDateTo);

    return this.http.get(`${this.url}/export`, {
      params,
      responseType: 'blob',
    });
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

  private buildSearchParams(
    keyword: string,
    awardDateFrom: string,
    awardDateTo: string,
  ): HttpParams {
    let params = new HttpParams();

    if (keyword.trim()) {
      params = params.set('keyword', keyword.trim());
    }

    if (awardDateFrom) {
      params = params.set('awardDateFrom', awardDateFrom);
    }

    if (awardDateTo) {
      params = params.set('awardDateTo', awardDateTo);
    }

    return params;
  }
}
