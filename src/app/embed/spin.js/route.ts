// Static JS bundle merchants paste into their storefront:
//   <div data-spinr="<sessionId>"></div>
//   <script src="https://spinr.app/embed/spin.js" defer></script>
// The script finds every data-spinr div, injects an iframe pointing at
// /embed/<sessionId>, and lets that page render the SpinScrubber. Iframe
// isolates the merchant's CSS/JS from ours.

const SCRIPT = `(function () {
  var origin = document.currentScript && document.currentScript.src
    ? new URL(document.currentScript.src).origin
    : "";
  function mount(el) {
    var id = el.getAttribute("data-spinr");
    if (!id || el.dataset.spinrMounted === "1") return;
    el.dataset.spinrMounted = "1";
    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed/" + encodeURIComponent(id);
    iframe.style.border = "0";
    iframe.style.width = "100%";
    iframe.style.height = el.style.height || "520px";
    iframe.style.display = "block";
    iframe.setAttribute("allow", "fullscreen");
    iframe.setAttribute("title", "360 product spin");
    el.appendChild(iframe);
  }
  function scan() {
    var nodes = document.querySelectorAll("[data-spinr]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
  // Handle client-side navigation on SPAs (Shopify sections re-render).
  var mo = new MutationObserver(scan);
  mo.observe(document.body, { childList: true, subtree: true });
})();`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
