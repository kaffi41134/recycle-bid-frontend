import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GovernmentBid, GovernmentBidRequest } from './government-bid.model';

@Injectable({ providedIn: 'root' })
export class GovernmentBidService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/government-bids';

  findAll() {
    return this.http.get<GovernmentBid[]>(this.url);
  }

  findById(id: number) {
    return this.http.get<GovernmentBid>(`${this.url}/${id}`);
  }

  create(request: GovernmentBidRequest) {
    return this.http.post<void>(this.url, request);
  }

  update(id: number, request: GovernmentBidRequest) {
    return this.http.put<void>(`${this.url}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
