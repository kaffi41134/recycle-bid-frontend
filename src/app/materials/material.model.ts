// 對應後端 MaterialRes / MaterialReq，品項代碼由後端產生。
export interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  enabled: boolean;
  createdAt: string | null;
}

export interface MaterialRequest {
  name: string;
  category: string;
  unit: string;
  enabled: boolean;
}

export const MATERIAL_CATEGORIES = ['金屬類', '紙類', '塑膠類', '玻璃類'];
