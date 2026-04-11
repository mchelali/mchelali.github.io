from scholarly import scholarly
import json
from collections import defaultdict

# 🔍 Remplace par ton nom EXACT sur Google Scholar
SCHOLAR_ID = "W9kmhasAAAAJ"

# 📥 Récupération auteur
author = scholarly.search_author_id(SCHOLAR_ID)
author = scholarly.fill(author)

# 📊 Publications par année
pubs_per_year = defaultdict(int)

for pub in author["publications"]:
    bib = pub.get("bib", {})
    year = bib.get("pub_year")

    if year:
        try:
            year = int(year)
            pubs_per_year[year] += 1
        except:
            pass

pubs_per_year = dict(sorted(pubs_per_year.items()))

# 📈 Citations par année (direct)
cites_per_year = author.get("cites_per_year", {})
cites_per_year = dict(sorted({int(k): v for k, v in cites_per_year.items()}.items()))

# 📊 Metrics globales
hindex = author.get("hindex", 0)
citations = author.get("citedby", 0)

data = {
    "hindex": hindex,
    "citations": citations,
    "publications_per_year": pubs_per_year,
    "citations_per_year": cites_per_year,
}

# 💾 Export
with open("metrics.json", "w") as f:
    json.dump(data, f, indent=2)

print("✅ metrics.json updated")
