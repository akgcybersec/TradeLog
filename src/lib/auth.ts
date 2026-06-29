import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { defaultSession, getSessionOptions, type SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function loginUser(email: string, password: string) {
  const result = await verifyUserCredentials(email, password);
  if (!result.ok) return result;

  const session = await getSession();
  session.userId = result.user.id;
  session.email = result.user.email;
  session.name = result.user.name ?? undefined;
  session.isLoggedIn = true;
  await session.save();

  return { ok: true as const, user: result.user };
}

export async function verifyUserCredentials(email: string, password: string) {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    console.warn("[auth] login failed: no user for email", normalized);
    return { ok: false as const, error: "Invalid email or password" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    console.warn("[auth] login failed: bad password for", normalized);
    return { ok: false as const, error: "Invalid email or password" };
  }

  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mustChangeCredentials: user.mustChangeCredentials,
    },
  };
}

export async function changeCredentials(input: {
  email: string;
  password: string;
  name?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const email = input.email.toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false as const, error: "Enter a valid email address" };
  }
  if (input.password.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters" };
  }

  const taken = await prisma.user.findFirst({
    where: { email, id: { not: user.id } },
    select: { id: true },
  });
  if (taken) return { ok: false as const, error: "That email is already in use" };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      email,
      name: input.name?.trim() || null,
      passwordHash: await hashPassword(input.password),
      mustChangeCredentials: false,
    },
  });

  const session = await getSession();
  session.email = updated.email;
  session.name = updated.name ?? undefined;
  await session.save();

  return { ok: true as const };
}

export async function logoutUser() {
  const session = await getSession();
  session.userId = "";
  session.email = "";
  session.name = undefined;
  session.isLoggedIn = false;
  await session.save();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function hasAnyUser() {
  const count = await prisma.user.count();
  return count > 0;
}

export async function createInitialUser(input: {
  email: string;
  password: string;
  name?: string | null;
}) {
  if (await hasAnyUser()) {
    return { ok: false as const, error: "An account already exists" };
  }

  const email = input.email.toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false as const, error: "Enter a valid email address" };
  }
  if (input.password.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters" };
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name?.trim() || null,
      passwordHash: await hashPassword(input.password),
      mustChangeCredentials: false,
    },
  });

  return {
    ok: true as const,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export { defaultSession };
