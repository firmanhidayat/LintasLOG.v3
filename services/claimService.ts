import { getLang } from "@/lib/i18n";
import { ClaimsResponse } from "@/types/claims";

export async function fetchOrderClaims(orderId: string | number): Promise<ClaimsResponse> {
    const xxxYYYZZZ = process.env.NEXT_PUBLIC_TMS_ORDER_FORM_URL ?? "";
    const response = await fetch(`${xxxYYYZZZ}/${orderId}/claims`, {
    method: 'GET',
    headers: {
      'Accept-Language': getLang(),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch claims: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchOrderClaims_T(orderId: string | number): Promise<ClaimsResponse> {
    const xxxYYYZZZ = process.env.NEXT_PUBLIC_TMS_P_ORDER_FORM_URL ?? "";
    const response = await fetch(`${xxxYYYZZZ}/${orderId}/claims`, {
    method: 'GET',
    headers: {
      'Accept-Language': getLang(),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch claims: ${response.statusText}`);
  }
  return response.json();
}