// export default function OrdersDetailPage() {
//   return (
//     <section>
//       <h1 className="text-2xl font-bold">Orders Detail</h1>
//       <p className="mt-2 text-gray-600">Example SPA route.</p>
//     </section>
//   );
// }

import OrdersCreateForm from "@/components/forms/orders/OrdersCreateForm";
export default function OrdersDetailPage() {
  return <OrdersCreateForm mode="edit" />;
}
