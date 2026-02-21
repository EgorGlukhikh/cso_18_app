import { UserRole } from "@prisma/client";
import { getCurrentUser } from "./auth";

export async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, status: 401, message: "Требуется вход" };
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    return { ok: false as const, status: 403, message: "Недостаточно прав" };
  }
  return { ok: true as const, user };
}

