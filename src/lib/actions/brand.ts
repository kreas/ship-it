"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { brands, workspaces } from "../db/schema";
import { eq, and } from "drizzle-orm";
import type { Brand, CreateBrandInput, UpdateBrandInput } from "../types";
import { getCurrentUserId } from "../auth";
import { requireWorkspaceAccess } from "./workspace";

/**
 * Get all brands for the current user
 */
export async function getUserBrands(): Promise<Brand[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const userBrands = await db
    .select()
    .from(brands)
    .where(eq(brands.userId, userId));

  return userBrands;
}

/**
 * Get a brand by ID
 */
export async function getBrandById(brandId: string): Promise<Brand | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const brand = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
    .get();

  return brand ?? null;
}

/**
 * Create a new brand for the current user
 */
export async function createBrand(input: CreateBrandInput): Promise<Brand> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const now = new Date();
  const newBrand = {
    userId,
    name: input.name,
    tagline: input.tagline ?? null,
    description: input.description ?? null,
    logoUrl: input.logoUrl ?? null,
    websiteUrl: input.websiteUrl ?? null,
    primaryColor: input.primaryColor ?? null,
    secondaryColor: input.secondaryColor ?? null,
    industry: input.industry ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.insert(brands).values(newBrand).returning();
  return result[0];
}

/**
 * Update an existing brand
 */
export async function updateBrand(
  brandId: string,
  input: UpdateBrandInput
): Promise<Brand> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Verify ownership
  const existing = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
    .get();

  if (!existing) {
    throw new Error("Brand not found or access denied");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.tagline !== undefined) updateData.tagline = input.tagline;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;
  if (input.websiteUrl !== undefined) updateData.websiteUrl = input.websiteUrl;
  if (input.primaryColor !== undefined) updateData.primaryColor = input.primaryColor;
  if (input.secondaryColor !== undefined) updateData.secondaryColor = input.secondaryColor;
  if (input.industry !== undefined) updateData.industry = input.industry;

  const result = await db
    .update(brands)
    .set(updateData)
    .where(eq(brands.id, brandId))
    .returning();

  revalidatePath("/w");

  return result[0];
}

/**
 * Delete a brand (will unlink from workspaces via ON DELETE SET NULL)
 */
export async function deleteBrand(brandId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Verify ownership
  const existing = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
    .get();

  if (!existing) {
    throw new Error("Brand not found or access denied");
  }

  await db.delete(brands).where(eq(brands.id, brandId));

  revalidatePath("/w");
}

/**
 * Get the brand linked to a workspace
 */
export async function getWorkspaceBrand(
  workspaceId: string
): Promise<Brand | null> {
  await requireWorkspaceAccess(workspaceId);

  const workspace = await db
    .select({ brandId: workspaces.brandId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .get();

  if (!workspace?.brandId) {
    return null;
  }

  const brand = await db
    .select()
    .from(brands)
    .where(eq(brands.id, workspace.brandId))
    .get();

  return brand ?? null;
}

/**
 * Link a brand to a workspace
 */
export async function setWorkspaceBrand(
  workspaceId: string,
  brandId: string
): Promise<void> {
  await requireWorkspaceAccess(workspaceId, "admin");

  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  // Verify brand ownership
  const brand = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
    .get();

  if (!brand) {
    throw new Error("Brand not found or access denied");
  }

  await db
    .update(workspaces)
    .set({
      brandId,
      primaryColor: brand.primaryColor,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  revalidatePath("/w");
}

/**
 * Unlink a brand from a workspace
 */
export async function unlinkWorkspaceBrand(workspaceId: string): Promise<void> {
  await requireWorkspaceAccess(workspaceId, "admin");

  await db
    .update(workspaces)
    .set({
      brandId: null,
      primaryColor: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  revalidatePath("/w");
}
