import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Material, MaterialRequest } from './material.model';

@Injectable({ providedIn: 'root' })
export class MaterialService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/materials';

  findAll() {
    return this.http.get<Material[]>(this.url);
  }

  findById(id: number) {
    return this.http.get<Material>(`${this.url}/${id}`);
  }

  create(request: MaterialRequest) {
    return this.http.post<Material>(this.url, request);
  }

  update(id: number, request: MaterialRequest) {
    return this.http.put<Material>(`${this.url}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
