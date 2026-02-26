import { getUserProfile } from "@/lib/actions/users";
import {
  getUserSubscription,
  getSubscriptionPlans,
  getUserInvoices,
} from "@/lib/actions/subscription";
import { redirect } from "next/navigation";
import { ProfileContent } from "./_components/ProfileContent";

export default async function ProfilePage() {
  const [profile, subscription, plans, invoices] = await Promise.all([
    getUserProfile(),
    getUserSubscription(),
    getSubscriptionPlans(),
    getUserInvoices(),
  ]);

  if (!profile) {
    redirect("/login");
  }

  return (
    <ProfileContent
      profile={profile}
      subscription={subscription}
      plans={plans}
      invoices={invoices}
    />
  );
}
