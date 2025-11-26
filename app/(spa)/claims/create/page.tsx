"use client";
import { useRouter } from "next/navigation";
import ClaimFormPage from "@/components/forms/ClaimsForm";
import { RecordItem } from "@/types/recorditem";
import { useMemo } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { TmsUserType } from "@/types/tms-profile";

export default function ClaimsCreatePage() {
  const router = useRouter();

  // const { value: orderId } = useEphemeralLocalStorage<string>("order-id", {
  //   required: true,
  //   redirectTo: "/claims",
  // });

  // if (!orderId) {
  //   return null;
  // }

      const { profile } = useAuth();
          const userType = useMemo(() => {
            if (profile) return profile.tms_user_type;
            return undefined;
          }, [profile]);

  return (
    <ClaimFormPage
      mode="create"
      userType={userType as TmsUserType}
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
