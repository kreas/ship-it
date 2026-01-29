"use client";

import { useState } from "react";
import { Globe, Palette, Building2 } from "lucide-react";
import type { Brand, CreateBrandInput } from "@/lib/types";

interface BrandPreviewProps {
  brand: Partial<Brand> | null;
  onSave: (data: CreateBrandInput) => void;
  onCancel: () => void;
  isLoading: boolean;
  isNewBrand?: boolean;
}

export function BrandPreview({
  brand,
  onSave,
  onCancel,
  isLoading,
  isNewBrand = true,
}: BrandPreviewProps) {
  const [formData, setFormData] = useState<CreateBrandInput>({
    name: brand?.name ?? "",
    tagline: brand?.tagline ?? "",
    description: brand?.description ?? "",
    logoUrl: brand?.logoUrl ?? "",
    websiteUrl: brand?.websiteUrl ?? "",
    primaryColor: brand?.primaryColor ?? "#3b82f6",
    secondaryColor: brand?.secondaryColor ?? "#10b981",
    industry: brand?.industry ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  const handleChange = (
    field: keyof CreateBrandInput,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-lg font-medium text-foreground mb-2 text-center">
        {isNewBrand ? "Review Brand Details" : "Edit Brand"}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 text-center">
        {isNewBrand
          ? "Review and edit the brand information before saving"
          : "Update the brand details"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Preview */}
        <div className="flex justify-center">
          {formData.logoUrl ? (
            <img
              src={formData.logoUrl}
              alt={formData.name}
              className="w-24 h-24 rounded-lg object-contain bg-white border border-border"
            />
          ) : (
            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border border-border">
              <Globe className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Logo URL
          </label>
          <input
            type="url"
            value={formData.logoUrl}
            onChange={(e) => handleChange("logoUrl", e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Brand Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Acme Inc."
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
            required
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Tagline
          </label>
          <input
            type="text"
            value={formData.tagline}
            onChange={(e) => handleChange("tagline", e.target.value)}
            placeholder="Making the world a better place"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="A brief description of the brand..."
            rows={3}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Website URL */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Website URL
          </label>
          <input
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => handleChange("websiteUrl", e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Primary Color
              </div>
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="w-10 h-10 rounded border border-input cursor-pointer"
                disabled={isLoading}
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                placeholder="#3b82f6"
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Secondary Color
              </div>
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                className="w-10 h-10 rounded border border-input cursor-pointer"
                disabled={isLoading}
              />
              <input
                type="text"
                value={formData.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                placeholder="#10b981"
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Industry
            </div>
          </label>
          <input
            type="text"
            value={formData.industry}
            onChange={(e) => handleChange("industry", e.target.value)}
            placeholder="Technology, Healthcare, Retail, etc."
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 border border-border rounded-lg hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.name.trim() || isLoading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Saving..." : "Save Brand"}
          </button>
        </div>
      </form>
    </div>
  );
}
