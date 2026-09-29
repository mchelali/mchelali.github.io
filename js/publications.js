// Renders bib.bib into the publications section.
// Entries are grouped by type; an @inproceedings with "national" in its
// keywords field goes to the national (French-speaking) conferences group.
(function () {
  const HIGHLIGHT_AUTHOR = "chelali";

  const GROUPS = [
    { title: "Journals", label: "journal articles", prefix: "J", match: (e) => e.type === "article" },
    { title: "International Conferences", label: "international conference papers", prefix: "C", match: (e) => isProceedings(e) && !isNational(e) },
    { title: "National Conferences", label: "national conference papers", prefix: "N", match: (e) => isProceedings(e) && isNational(e) },
    { title: "Talks", label: "talks", prefix: "T", match: (e) => e.type === "misc" },
    { title: "Thesis", label: "PhD thesis", prefix: "PhD", match: (e) => ["phdthesis", "mastersthesis", "bachelorsthesis", "techreport"].includes(e.type) },
    { title: "Other", label: "other", prefix: "O", match: () => true },
  ];

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  const ACCENTS = { "'": "́", "`": "̀", "^": "̂", '"': "̈", "~": "̃", "c": "̧" };

  function isProceedings(entry) {
    return ["inproceedings", "conference", "proceedings", "nationalroceedings"].includes(entry.type);
  }

  function isNational(entry) {
    return entry.type === "nationalroceedings" || /\bnational\b/i.test(entry.fields.keywords || "");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  // Turns common LaTeX markup into plain Unicode text.
  function latexToText(value) {
    return String(value || "")
      .replace(/\\([`'^"~c])\s*\{?\\?([A-Za-z])\}?/g, (m, accent, letter) => (letter + ACCENTS[accent]).normalize("NFC"))
      .replace(/\\([&%$#_])/g, "$1")
      .replace(/\\(textit|textbf|emph|textsc)\s*/g, "")
      .replace(/---/g, "—")
      .replace(/--/g, "–")
      .replace(/~/g, " ")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function splitEntries(input) {
    const entries = [];
    let i = 0;

    while (i < input.length) {
      const at = input.indexOf("@", i);
      if (at === -1) break;

      const open = input.indexOf("{", at);
      if (open === -1) break;

      let depth = 0;
      let end = open;
      for (; end < input.length; end += 1) {
        if (input[end] === "{") depth += 1;
        if (input[end] === "}") depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }

      entries.push(input.slice(at, end));
      i = end;
    }

    return entries;
  }

  function parseFields(body) {
    const fields = {};
    let i = 0;

    while (i < body.length) {
      while (/[\s,]/.test(body[i] || "")) i += 1;

      const keyStart = i;
      while (/[A-Za-z0-9_:-]/.test(body[i] || "")) i += 1;
      const key = body.slice(keyStart, i).toLowerCase();

      while (/\s/.test(body[i] || "")) i += 1;
      if (!key || body[i] !== "=") {
        i += 1;
        continue;
      }

      i += 1;
      while (/\s/.test(body[i] || "")) i += 1;

      let value = "";
      if (body[i] === "{") {
        let depth = 0;
        const valueStart = i + 1;
        for (; i < body.length; i += 1) {
          if (body[i] === "{") depth += 1;
          if (body[i] === "}") depth -= 1;
          if (depth === 0) {
            value = body.slice(valueStart, i);
            i += 1;
            break;
          }
        }
      } else if (body[i] === '"') {
        const valueStart = i + 1;
        i += 1;
        while (i < body.length && body[i] !== '"') i += 1;
        value = body.slice(valueStart, i);
        i += 1;
      } else {
        const valueStart = i;
        while (i < body.length && body[i] !== ",") i += 1;
        value = body.slice(valueStart, i);
      }

      fields[key] = value.replace(/\s+/g, " ").trim();
    }

    return fields;
  }

  function parseBibtex(input) {
    return splitEntries(input).map((raw) => {
      const header = raw.match(/^@\s*([A-Za-z]+)\s*\{\s*([^,\s]+)\s*,/);
      if (!header) return null;

      const type = header[1].toLowerCase();
      if (["comment", "preamble", "string"].includes(type)) return null;

      const fields = parseFields(raw.slice(header[0].length, -1));
      const yearMatch = (fields.year || "").match(/\d{4}/);

      return {
        type,
        key: header[2],
        raw: raw.trim(),
        fields,
        year: yearMatch ? parseInt(yearMatch[0], 10) : 0,
        month: parseMonth(fields.month),
      };
    }).filter(Boolean);
  }

  function parseMonth(value) {
    const text = String(value || "").trim().toLowerCase();
    if (/^\d+$/.test(text)) return parseInt(text, 10);
    const index = MONTHS.indexOf(text.slice(0, 3));
    return index === -1 ? 0 : index + 1;
  }

  // "Chelali, Mohamed" -> "M. Chelali"; "Gosselet, S.-K." -> "S.-K. Gosselet"
  function formatAuthor(name) {
    let first = "";
    let last = name;

    if (name.includes(",")) {
      [last, first] = name.split(",").map((part) => part.trim());
    } else {
      const parts = name.split(" ");
      last = parts.pop();
      first = parts.join(" ");
    }

    const initials = first
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.split("-").map((p) => (p.endsWith(".") ? p : `${p[0]}.`)).join("-"))
      .join(" ");

    const label = escapeHtml([initials, last].filter(Boolean).join(" "));
    return last.toLowerCase() === HIGHLIGHT_AUTHOR ? `<strong class="me">${label}</strong>` : label;
  }

  function formatAuthors(value) {
    const authors = latexToText(value).split(/\s+and\s+/i).filter(Boolean).map(formatAuthor);
    if (authors.length <= 1) return authors.join("");
    return `${authors.slice(0, -1).join(", ")} and ${authors[authors.length - 1]}`;
  }

  function doiLink(value) {
    const doi = String(value || "").match(/10\.\d{4,9}\/[^\s"<>]+/);
    if (doi) return { href: `https://doi.org/${doi[0]}`, label: "DOI" };
    if (/^https?:\/\//.test(value || "")) return { href: value, label: "Link" };
    return null;
  }

  function renderEntry(entry, id) {
    const f = entry.fields;
    const venue = latexToText(f.journal || f.booktitle || f.school || f.howpublished || f.institution || "");
    const details = [
      f.volume ? `vol. ${escapeHtml(latexToText(f.volume))}` : "",
      f.number ? `no. ${escapeHtml(latexToText(f.number))}` : "",
      f.pages ? `pp. ${escapeHtml(latexToText(f.pages).replace(/-+/g, "\u2013"))}` : "",
      entry.year ? String(entry.year) : "",
    ].filter(Boolean);

    const doi = doiLink(f.doi);
    const links = [
      f.pdf ? `<a href="${escapeHtml(f.pdf)}">PDF</a>` : "",
      doi ? `<a href="${escapeHtml(doi.href)}">${doi.label}</a>` : "",
      f.url ? `<a href="${escapeHtml(f.url)}">URL</a>` : "",
      f.code ? `<a href="${escapeHtml(f.code)}">Code</a>` : "",
      `<button class="toggle-bibtex" type="button" aria-expanded="false">BibTeX</button>`,
    ].filter(Boolean);

    return `
      <li class="publication-entry">
        <span class="publication-id">${id}</span>
        <div>
          <div class="publication-title">${escapeHtml(latexToText(f.title))}</div>
          <div class="publication-authors">${formatAuthors(f.author)}</div>
          <div class="publication-venue">
            ${venue ? `<em>${escapeHtml(venue)}</em>` : ""}${venue && details.length ? ", " : ""}${details.join(", ")}
            <span class="publication-links">${links.join("")}</span>
          </div>
          <div class="bibtex-box" hidden>
            <button class="copy-bibtex" type="button">Copy</button>
            <pre>${escapeHtml(entry.raw)}</pre>
          </div>
        </div>
      </li>
    `;
  }

  function render(bibtex, target) {
    const entries = parseBibtex(bibtex).sort((a, b) => b.year - a.year || b.month - a.month);
    const remaining = new Set(entries);

    const groups = GROUPS.map((group) => {
      const items = entries.filter((entry) => remaining.has(entry) && group.match(entry));
      items.forEach((entry) => remaining.delete(entry));
      return { group, items };
    }).filter(({ items }) => items.length);

    // Most recent first, numbered down to 1 (e.g. J3, J2, J1).
    const summary = groups
      .map(({ group, items }) => `<span><strong>${items.length}</strong> ${escapeHtml(group.label)}</span>`)
      .join("");

    target.innerHTML = `<p class="publication-summary">${summary}</p>` + groups.map(({ group, items }) => `
      <div class="publication-group">
        <h3>${escapeHtml(group.title)}</h3>
        <ol class="publication-list">
          ${items.map((entry, i) => renderEntry(entry, items.length > 1 || group.prefix !== "PhD" ? `${group.prefix}${items.length - i}` : group.prefix)).join("")}
        </ol>
      </div>
    `).join("");

    target.addEventListener("click", (event) => {
      const toggle = event.target.closest(".toggle-bibtex");
      if (toggle) {
        const box = toggle.closest(".publication-entry").querySelector(".bibtex-box");
        box.hidden = !box.hidden;
        toggle.setAttribute("aria-expanded", String(!box.hidden));
        return;
      }

      const button = event.target.closest(".copy-bibtex");
      if (!button) return;

      const text = button.nextElementSibling.textContent;
      navigator.clipboard.writeText(text).then(() => {
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1500);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const source = document.getElementById("bibtex_source");
    const target = document.getElementById("bibtex_display");
    if (!source || !target) return;

    const src = source.dataset.src || "bib.bib";
    target.innerHTML = `<p class="section-note">Loading publications...</p>`;

    fetch(src)
      .then((response) => {
        if (!response.ok) throw new Error(`Cannot load ${src}`);
        return response.text();
      })
      .then((bibtex) => render(bibtex, target))
      .catch(() => {
        target.innerHTML = `
          <p class="publication-error">
            Publications could not be loaded from <code>${escapeHtml(src)}</code>.
            Please open this page through a local server or GitHub Pages.
          </p>
        `;
      });
  });
})();
