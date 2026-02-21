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

  // Optional: prevent [[Wiki Links]] from showing as raw brackets after client-side parsing.
  function stripWikiLinks(md) {
    md = md.replaceAll(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2"); // [[Page|Alias]] -> Alias
    md = md.replaceAll(/\[\[([^\]]+)\]\]/g, "$1"); // [[Page]] -> Page
    return md;
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