import { sealData, unsealData } from "iron-session";

function getPassword(): string {
  const password = process.env.SOCIAL_TOKEN_ENCRYPTION_SECRET || "";
  if (!password && process.env.NODE_ENV === "production") {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_SECRET is required in production");
  }
  return password;
}

export async function encryptToken(token: string): Promise<string> {
  return sealData(token, { password: getPassword() });
}

export async function decryptToken(sealed: string): Promise<string> {
  return unsealData<string>(sealed, { password: getPassword() });
}
