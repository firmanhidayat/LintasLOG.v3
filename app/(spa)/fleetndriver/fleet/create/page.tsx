"use client";
import { useRouter } from "next/navigation";
import FleetFormPage from "@/components/forms/FleetForm";
import { RecordItem } from "@/types/recorditem";

export default function FleetCreatePage() {
  const router = useRouter();
  return (
    <FleetFormPage
      mode="create"
      onSuccess={(data) => {
        const newId =
          data && typeof data === "object" && "id" in data
            ? String((data as RecordItem).id)
            : null;
        router.replace(
          newId
            ? `/fleetndriver/fleet/details?id=${encodeURIComponent(newId)}`
            : "/fleetndriver/fleet/list"
        );
      }}
    />
  );
}
