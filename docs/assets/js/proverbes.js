// WawléLearn — Proverbes publics (lecture seule)
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}

(async () => {
  const root = document.getElementById("prov");
  if (!root) return;

  const { data, error } = await sb
    .from("proverbes")
    .select("baoule, francais, source")
    .order("id")
    .limit(200);

  root.appendChild(el("h2", null, "📜 Proverbes baoulé"));

  if (error || !data || !data.length) {
    root.appendChild(el("p", "mots", "Les proverbes arrivent très bientôt."));
    return;
  }

  // Proverbe du jour : change chaque jour automatiquement
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const jour = Math.floor((now - start) / 86400000);
  let actuel = jour % data.length;

  const zone = el("div");
  root.appendChild(zone);

  function afficher(i) {
    const p = data[i];
    zone.textContent = "";
    const c = el("div", "card prov-jour");
    c.appendChild(el("span", "badge", "Proverbe du jour"));
    c.appendChild(el("h3", null, p.baoule));
    c.appendChild(el("p", null, p.francais));
    if (p.source) c.appendChild(el("p", "mots", "Source : " + p.source));
    zone.appendChild(c);
  }
  afficher(actuel);

  const actions = el("div", "admin-row");
  const btn = el("button", "btn ghost", "🎲 Un autre proverbe");
  btn.addEventListener("click", () => {
    if (data.length < 2) return;
    let i = actuel;
    while (i === actuel) i = Math.floor(Math.random() * data.length);
    actuel = i;
    afficher(i);
  });
  actions.appendChild(btn);
  root.appendChild(actions);

  root.appendChild(el("h3", null, "Tous les proverbes (" + data.length + ")"));
  const ul = el("ul", "liste");
  data.forEach((p) => {
    const li = el("li");
    li.appendChild(el("b", null, p.baoule));
    li.appendChild(document.createTextNode(" — " + p.francais + (p.source ? "  (" + p.source + ")" : "")));
    ul.appendChild(li);
  });
  root.appendChild(ul);
})();
