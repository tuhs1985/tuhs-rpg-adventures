const fs = require("fs");
const matter = require("gray-matter");
const path = require("path");
const slugify = require("@sindresorhus/slugify");

// Build a map of all note titles to their permalinks
function buildWikilinkMap() {
  const linkMap = {};
  const notesDir = "./src/site/notes/";

  function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath);
      } else if (item.endsWith(".md")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const frontMatter = matter(content);

          // Get the note title (filename without extension)
          const noteTitle = path.basename(item, ".md");

          // Determine permalink
          let permalink = `/notes/${slugify(noteTitle)}/`;

          if (frontMatter.data.permalink) {
            permalink = frontMatter.data.permalink;
            // Ensure trailing slash
            if (!permalink.endsWith('/')) {
              permalink += '/';
            }
          }

          if (frontMatter.data.tags && frontMatter.data.tags.includes("gardenEntry")) {
            permalink = "/";
          }

          // Store in map (case-insensitive lookup)
          linkMap[noteTitle.toLowerCase()] = permalink;
        } catch (error) {
          // Silently skip files that can't be read
        }
      }
    }
  }

  processDirectory(notesDir);
  return linkMap;
}

// Put your computations here.
function userComputed(data) {
  return {
    wikilinkMap: buildWikilinkMap()
  };
}

exports.userComputed = userComputed;
