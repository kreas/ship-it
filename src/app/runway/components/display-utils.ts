/**
 * Compute display values for the owner/resources separation.
 * Resources shown prominently; owner shown separately only when different.
 */
export function getOwnerResourcesDisplay(item: { owner?: string; resources?: string }) {
  return {
    showOwnerSeparately: !!(item.owner && item.resources && item.resources !== item.owner),
    displayResources: item.resources ?? item.owner,
  };
}
