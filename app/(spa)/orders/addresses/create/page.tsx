"use client";

import { useRouter } from "next/navigation";
import AddressForm from "@/forms/AddressesForm";
import { useI18nReady } from "@/hooks/useI18nReady";
// import { t } from "@/lib/i18n";

export default function CreateAddressesPage() {
  const router = useRouter();
  const { i18nReady, activeLang } = useI18nReady();

  if (!i18nReady) {
    return (
      <div className="max-w-xl" data-lang={activeLang}>
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-md bg-slate-100" />
      </div>
    );
  }

  return (
    // <div className="max-auto" data-lang={activeLang}>
    //   <h1 className="mb-4 text-xl font-semibold">
    //     {t("addr.page.createTitle")}
    //   </h1>
    <AddressForm
      mode="create"
      onSuccess={() => {
        router.push("/orders/addresses/list");
      }}
    />
    // </div>
  );
}
