import { Suspense } from "react";
import { redirect } from "next/navigation";
import AccountSetupForm from "@/components/auth/AccountSetupForm";
import { getStaffProfile } from "@/lib/auth";

async function SetupAccountContent() {
  const profile = await getStaffProfile();
  if (!profile) {
    redirect("/login?status=pending");
  }
  if (!profile.must_change_password) {
    redirect(profile.role === "panitia" ? "/panitia" : "/juri/karya");
  }

  return <AccountSetupForm initialName={profile.nama} />;
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f2f4f3]" />}>
      <SetupAccountContent />
    </Suspense>
  );
}
