import { signOut } from "@/auth";
import { apiOk, handleApiError } from "@/lib/api";

export async function POST() {
  try {
    await signOut({ redirect: false });
    return apiOk({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
