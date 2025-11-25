"use client";

import OrdersCreateForm from "@/components/forms/orders/OrdersCreateForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { TmsUserType } from "@/types/tms-profile";
import { useMemo } from "react";
export default function OrdersCreatePage() {
  const { profile } = useAuth();
    const userType = useMemo(() => {
      if (profile) return profile.tms_user_type;
      return undefined;
    }, [profile]);
  return <OrdersCreateForm  userType={userType as TmsUserType}  mode="create" />;
}
