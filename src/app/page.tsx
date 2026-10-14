import { redirect } from "next/navigation";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string | string[];
    type?: string | string[];
  }>;
}) {
  // Older Studio emails point to Site URL; preserve the token without using it.
  const { token_hash, type } = await searchParams;
  if (
    typeof token_hash === "string" &&
    token_hash.length > 0 &&
    token_hash.length <= 512 &&
    (type === "invite" || type === "recovery")
  ) {
    const params = new URLSearchParams({ token_hash, type });
    redirect(`/auth/accept?${params.toString()}`);
  }
  redirect("/overview");
}
