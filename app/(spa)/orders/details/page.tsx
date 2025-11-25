"use client";

import React, { useMemo } from "react";
import OrdersCreateForm from "@/components/forms/orders/OrdersCreateForm";
import { useAuth } from "@/components/providers/AuthProvider";
import PurchaseOrderForm from "@/components/forms/orders/sections/transporter/PurchaseOrderForm";
import { TmsUserType } from "@/types/tms-profile";

export default function OrdersDetailPage() {
  const { profile } = useAuth();
  const userType = useMemo(() => {
    if (profile) return profile.tms_user_type;
    return undefined;
  }, [profile]);
  const isShipper = userType === "shipper" ? true : false;
  if (isShipper) return <OrdersCreateForm userType={userType as TmsUserType}  mode="edit" />;
  else return <PurchaseOrderForm userType={userType as TmsUserType} mode="edit" />;
}
