// src/site/scripts/pf2e-statblock.js
(() => {
  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Convert Obsidian highlight ==text== into HTML <mark>text</mark>
  function obsidianMarksToHtml(md) {
    return md.replaceAll(/==(.+?)==/g, "<mark>$1</mark>");
  }

  // Convert [[Wiki Links]] to markdown links with temporary anchors
  function wikiLinksToMarkdown(md) {
    // [[Folder/Page|Alias]] or [[Page|Alias]] → [Alias](#wl:Page)
    md = md.replaceAll(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, target, alias) => {
      return `[${alias}](#wl:${encodeURIComponent(target.trim())})`;
    });
    // [[Page]] or [[Folder/Page]] → [Page](#wl:Page)
    md = md.replaceAll(/\[\[([^\]]+)\]\]/g, (match, target) => {
      const trimmed = target.trim();
      const display = trimmed.includes("/") ? trimmed.split("/").pop() : trimmed;
      return `[${display}](#wl:${encodeURIComponent(trimmed)})`;
    });
    return md;
  }

  // Build a map of note names/slugs to their actual URLs by scanning existing links
  function buildLinkMap() {
    const map = new Map();
    document.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) return;

      const text = (link.textContent || "").trim();
      if (!text) return;

      // Store by exact link text (case-insensitive)
      map.set(text.toLowerCase(), href);

      // Extract the final segment of the URL path for additional matching
      const pathMatch = href.match(/\/([^\/]+)\/?$/);
      if (pathMatch && pathMatch[1]) {
        const segment = pathMatch[1];
        map.set(segment.toLowerCase(), href);
        // Also store segment with dashes converted to spaces
        const segmentAsTitle = segment.replace(/-/g, " ");
        map.set(segmentAsTitle.toLowerCase(), href);
      }
    });
    return map;
  }

  // Resolve temporary #wl: links to actual URLs
  function resolveWikiLinks(wrapper, linkMap) {
    wrapper.querySelectorAll("a[href^='#wl:']").forEach((link) => {
      const encoded = link.getAttribute("href").substring(4); // Remove "#wl:"
      const target = decodeURIComponent(encoded);

      let realHref = null;

      // Try exact match (case-insensitive)
      realHref = linkMap.get(target.toLowerCase());

      // Try just the page name (strip folder path)
      if (!realHref && target.includes("/")) {
        const pageName = target.split("/").pop();
        realHref = linkMap.get(pageName.toLowerCase());
      }

      // Try converting to URL slug
      if (!realHref) {
        const slug = target.toLowerCase()
          .replace(/[^a-z0-9\/]+/g, "-")
          .replace(/^-|-$/g, "")
          .split("/").pop();
        realHref = linkMap.get(slug);
      }

      if (realHref) {
        link.setAttribute("href", realHref);
      } else {
        // Fallback: create naive slug-based link
        const slug = target.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        link.setAttribute("href", `/${slug}/`);
        link.classList.add("wl-unresolved");
      }
    });
  }

  function renderMarkdown(md) {
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(md);
    }
    return `<pre><code>${escapeHtml(md)}</code></pre>`;
  }

  const TRAIT_CLASS = new Map([
    ["tiny", "pf2e-statblock-trait-size"],
    ["small", "pf2e-statblock-trait-size"],
    ["medium", "pf2e-statblock-trait-size"],
    ["large", "pf2e-statblock-trait-size"],
    ["huge", "pf2e-statblock-trait-size"],
    ["gargantuan", "pf2e-statblock-trait-size"],
    ["lg", "pf2e-statblock-trait-alignment"],
    ["ng", "pf2e-statblock-trait-alignment"],
    ["cg", "pf2e-statblock-trait-alignment"],
    ["ln", "pf2e-statblock-trait-alignment"],
    ["n", "pf2e-statblock-trait-alignment"],
    ["cn", "pf2e-statblock-trait-alignment"],
    ["le", "pf2e-statblock-trait-alignment"],
    ["ne", "pf2e-statblock-trait-alignment"],
    ["ce", "pf2e-statblock-trait-alignment"],
    ["uncommon", "pf2e-statblock-trait-uncommon"],
    ["rare", "pf2e-statblock-trait-rare"],
    ["unique", "pf2e-statblock-trait-unique"],
  ]);

  function traitClass(text, isStarfinder) {
    const key = (text || "").trim().toLowerCase();
    const cls = TRAIT_CLASS.get(key);
    if (cls) return cls;
    return isStarfinder ? "sf2e-statblock-trait-normal" : "pf2e-statblock-trait-normal";
  }

  function replaceIndentation(md) {
    const tabSpan = '<span class="pf2e-statblock-tab"></span>';
    return md.replaceAll(/\n(\t| {4}|\u3000)+/ug, (m) =>
      m.replaceAll(/\t| {4}|\u3000/ug, tabSpan)
    );
  }

  function transformStatblockCodeBlock(codeEl, isStarfinder) {
    const pre = codeEl.closest("pre");
    if (!pre) return;

    let raw = codeEl.textContent ?? "";
    raw = stripWikiLinks(raw);
    raw = obsidianMarksToHtml(raw);
    raw = replaceIndentation(raw);

    const wrapper = document.createElement("div");
    wrapper.className = "pf2e-statblock";
    wrapper.innerHTML = renderMarkdown(raw);

    // Trait styling based on <mark>
    wrapper.querySelectorAll("mark").forEach((m) => {
      m.classList.add(traitClass(m.textContent, isStarfinder));
      if (isStarfinder) m.classList.add("starfinder-trait");
    });

    // Action icons: ``[one-action]`` etc. become <code>[one-action]</code>
    wrapper.querySelectorAll("code").forEach((c) => {
      const t = c.textContent ?? "";
      if (t.startsWith("[") && t.endsWith("]")) c.classList.add("action-icon");
    });

    pre.replaceWith(wrapper);
  }

  function run() {
    document.querySelectorAll("pre > code").forEach((code) => {
      const cls = code.className || "";
      const isPF2E = cls.includes("language-pf2e-stats") || cls.includes("lang-pf2e-stats");
      const isSF2E = cls.includes("language-sf2e-stats") || cls.includes("lang-sf2e-stats");
      if (isPF2E) transformStatblockCodeBlock(code, false);
      if (isSF2E) transformStatblockCodeBlock(code, true);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();