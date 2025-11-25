"use client";
import { useRouter } from "next/navigation";
import ClaimFormPage from "@/components/forms/ClaimsForm";
import { RecordItem } from "@/types/recorditem";

export default function ClaimsCreatePage() {
  const router = useRouter();

  // const { value: orderId } = useEphemeralLocalStorage<string>("order-id", {
  //   required: true,
  //   redirectTo: "/claims",
  // });

  // if (!orderId) {
  //   return null;
  // }

  return (
    <ClaimFormPage
      mode="create"
      onSuccess={(data) => {
        const newId =
          data && typeof data === "object" && "id" in data
            ? String((data as RecordItem).id)
            : null;
        router.replace(
          newId
            ? `/claims/details?id=${encodeURIComponent(newId)}`
            : "/claims/list"
        );
      }}
    />
  );
}
