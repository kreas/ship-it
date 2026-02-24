/**
 * Print a DOM element as PDF using the browser's native print dialog.
 * Clones the element into a temporary `.print-container` that `@media print`
 * CSS reveals while hiding everything else.
 */
export function printElementAsPdf(
  element: HTMLElement,
  title?: string
): void {
  const originalTitle = document.title;

  // Clone the rendered content
  const clone = element.cloneNode(true) as HTMLElement;

  // Strip interactive elements (buttons, inputs) from the clone
  clone.querySelectorAll("button, input, [role='button']").forEach((el) => el.remove());

  // Wrap in a print container
  const container = document.createElement("div");
  container.className = "print-container";
  container.appendChild(clone);
  document.body.appendChild(container);

  // Set document title so the browser suggests it as the PDF filename
  if (title) {
    document.title = title.replace(/\.[^.]+$/, ""); // strip file extension
  }

  const cleanup = () => {
    container.remove();
    document.title = originalTitle;
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.print();
}
