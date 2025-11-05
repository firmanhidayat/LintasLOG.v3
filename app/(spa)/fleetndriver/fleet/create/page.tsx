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

// "use client";

// import FleetFormPage from "@/components/forms/FleetForm";
// import { RecordItem } from "@/types/recorditem";
// import { useRouter } from "next/navigation";

// export default function FleetPage() {
//   const router = useRouter();
//   return (
//     <FleetFormPage
//       mode="create"
//       onSuccess={(data) => {
//         const newId =
//           data && typeof data === "object" && "id" in data
//             ? String((data as RecordItem).id)
//             : null;
//         if (newId)
//           router.replace(`/fleets/details?id=${encodeURIComponent(newId)}`);
//         else router.replace(`/fleets/list?created=1`);
//       }}
//     />
//   );
// }
