import { ComposeLauncher } from "@/components/post/compose-launcher";
import { getSessionUser } from "@/lib/session";

/** FAB mobile untuk membuka modal compose di halaman mana pun. */
export async function MobileComposeFab() {
  const user = await getSessionUser();
  if (!user) return null;

  return (
    <ComposeLauncher
      variant="fab"
      user={{
        name: user.name ?? user.username,
        avatarUrl: user.image ?? null,
      }}
    />
  );
}
