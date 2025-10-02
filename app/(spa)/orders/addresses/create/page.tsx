"use client";
import { useRouter } from "next/navigation";
import AddressForm from "@/forms/AddressesForm";

export default function CreateAddressesPage() {
  const router = useRouter();
  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-xl font-semibold">New Address</h1>
      <AddressForm
        onSuccess={() => {
          router.push("/orders/addresses/list");
        }}
      />
    </div>
  );
}
