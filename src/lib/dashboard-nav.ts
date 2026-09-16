export function navigateToAnchor(anchor: string, block: ScrollLogicalPosition = "start") {
  if (anchor.startsWith("/")) {
    window.location.assign(anchor);
    return;
  }

  if (anchor === "#signals") {    window.dispatchEvent(new CustomEvent("dashboard:open-signals"));
  }

  const target = document.querySelector(anchor);
  if (!target) return;

  if (
    block === "center" &&
    target instanceof HTMLElement &&
    target.classList.contains("hub-row") &&
    !target.classList.contains("hub-row-open")
  ) {
    target.querySelector<HTMLButtonElement>(".hub-row-summary")?.click();
  }

  target.scrollIntoView({ behavior: "smooth", block });
  if (target instanceof HTMLElement) {
    target.classList.add("search-flash");
    window.setTimeout(() => target.classList.remove("search-flash"), 1200);
  }
}
