"use client";
import { useRouter } from "next/navigation";
import DriverFormPage from "@/components/forms/DriverForm";
import { RecordItem } from "@/types/recorditem";

export default function DriverCreatePage() {
  const router = useRouter();
  return (
    <DriverFormPage
      mode="create"
      onSuccess={(data) => {
        const newId =
          data && typeof data === "object" && "id" in data
            ? String((data as RecordItem).id)
            : null;
        router.replace(
          newId
            ? `/fleetndriver/driver/details?id=${encodeURIComponent(newId)}`
            : "/fleetndriver/driver/list?created=1"
        );
      }}
    />
  );
}
