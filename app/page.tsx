"use client";
// import { useEffect, useState } from "react";
// import { odooJsonRpc } from "@/lib/odoo";
import { redirect } from "next/navigation";
export default function Page() {
  redirect("dashboard");
  // const [count, setCount] = useState<number | null>(null);
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       // Example RPC to res.partner count
  //       const result = await odooJsonRpc<number>({
  //         model: "res.partner",
  //         method: "search_count",
  //         args: [[["active", "=", true]]],
  //       });
  //       setCount(result);
  //     } catch (e) {
  //       console.error(e);
  //     }
  //   })();
  // }, []);

  // return (
  //   <section className="space-y-4">
  //     <h1 className="text-2xl font-bold">Dashboard</h1>
  //     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  //       <div className="rounded-2xl border p-4">
  //         <div className="text-sm text-gray-500">Active Partners</div>
  //         <div className="text-3xl font-semibold">{count ?? "..."}</div>
  //       </div>
  //     </div>
  //   </section>
  // );
}
