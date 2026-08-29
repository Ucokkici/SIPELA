// =====================================================================
// SIPELA — Struktur Payload JWT
// =====================================================================

export interface JwtPayload {
  sub: number; // ID Pengguna (Employee ID atau Customer ID)
  email: string;
  tenant_id: number;
  branch_id?: number | null;
  role: string; // 'owner' | 'admin' | 'kasir' | 'operator' | 'staff' | 'kurir' | 'customer'
  type: 'employee' | 'customer';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  role: string;
  user: {
    id: number;
    email: string;
    name: string;
    tenant_id: number;
    branch_id?: number | null;
    role: string;
    type: 'employee' | 'customer';
  };
}
