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

  // Convert Obsidian [[Wiki Links]] into real links on the published site.
  // Assumes your DG pages use pretty URLs like /rurik-granitevein/
  function slugifyForDG(name) {
    return (name || "")
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  function convertWikiLinksToHtml(md, linkMap) {
    return md.replaceAll(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (_m, page, alias) => {
      const display = (alias || page).trim();

      const [pathPart, hashPart] = page.trim().split("#");
      const targetTitle = pathPart.split("/").pop().trim(); // title is what DG link text usually is

      // Prefer DG’s real link if we can find it
const key1 = targetTitle.trim();
const key2 = display.trim();
const key3 = slugifyForDG(targetTitle); // in case map stored slug keys

let href = linkMap?.get(key1) || linkMap?.get(key2) || linkMap?.get(key3);

      // If not found, fall back to a conservative guess (flat) rather than broken folders
      if (!href) {
        const slug = slugifyForDG(targetTitle);
        href = `/${slug}/`;
      }

      // Preserve section anchors if present
      if (hashPart) {
        const anchor = `#${slugifyForDG(hashPart)}`;
        href = href.includes("#") ? href : `${href}${anchor}`;
      }

      return `<a class="internal-link" href="${href}">${escapeHtml(display)}</a>`;
    });
  }
  function renderMarkdown(md) {
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(md);
    }
    return `<pre><code>${escapeHtml(md)}</code></pre>`;
  }
  
    // Build a map: "Note Title" -> "/real/path/"
function normalizeTitle(s) {
  return (s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildInternalLinkMap() {
  const map = new Map();

  document.querySelectorAll('a.internal-link[href]').forEach(a => {
    const href = a.getAttribute("href");
    if (!href) return;

    // Prefer the title from Obsidian/DG attributes when present
    const dataHref = a.getAttribute("data-href");      // sometimes exists
    const aria = a.getAttribute("aria-label");         // sometimes exists
    const titleAttr = a.getAttribute("title");         // sometimes exists
    const text = normalizeTitle(a.textContent);

    // Store multiple keys that might match what the wikilink contains
    const candidates = [dataHref, aria, titleAttr, text]
      .filter(Boolean)
      .map(normalizeTitle);

    candidates.forEach(k => {
      if (!map.has(k)) map.set(k, href);
    });

    // Also store the last path segment of the href itself as a key, e.g. "rurik-granitevein"
    const m = href.match(/\/([^\/#]+)\/?$/);
    if (m && m[1] && !map.has(m[1])) map.set(m[1], href);
  });

  return map;
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
    raw = convertWikiLinksToHtml(raw, window.__dgLinkMap);
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
	      window.__dgLinkMap = buildInternalLinkMap();
		  
    document.querySelectorAll("pre > code").forEach((code) => {
      const cls = code.className || "";
      const isPF2E = cls.includes("language-pf2e-stats") || cls.includes("lang-pf2e-stats");
      const isSF2E = cls.includes("language-sf2e-stats") || cls.includes("lang-sf2e-stats");
      if (isPF2E) transformStatblockCodeBlock(code, false);
      if (isSF2E) transformStatblockCodeBlock(code, true);
    });
	console.log("DG link map sample keys:", Array.from(window.__dgLinkMap.keys()).slice(0, 25));
console.log("DG link map for 'Rurik Granitevein':", window.__dgLinkMap.get("Rurik Granitevein"));
console.log("DG link map for 'rurik-granitevein':", window.__dgLinkMap.get("rurik-granitevein"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();