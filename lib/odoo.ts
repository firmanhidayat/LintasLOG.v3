// lib/odoo.ts

// Define the payload shape for Odoo JSON-RPC
export interface OdooRpcParams<A = unknown[], K = Record<string, unknown>> {
  model: string;
  method: string;
  args?: A;
  kwargs?: K;
}

// JSON-RPC request envelope
interface JsonRpcRequest<A = unknown[], K = Record<string, unknown>> {
  jsonrpc: "2.0";
  method: "call";
  params: OdooRpcParams<A, K>;
  id: number;
}

// JSON-RPC response envelope
interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

// Generic helper to call Odoo via our proxy
export async function odooJsonRpc<
  T = unknown,
  A extends unknown[] = unknown[],
  K extends Record<string, unknown> = Record<string, unknown>
>(params: OdooRpcParams<A, K>): Promise<T> {
  const body: JsonRpcRequest<A, K> = {
    jsonrpc: "2.0",
    method: "call",
    params,
    id: Date.now(),
  };

  const res = await fetch("/lini_translog/api/jsonrpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Odoo proxy error");

  const data: JsonRpcResponse<T> = await res.json();

  if (data.error) {
    throw new Error(data.error.message ?? "Odoo error");
  }

  if (data.result === undefined) {
    throw new Error("No result from Odoo");
  }

  return data.result;
}
