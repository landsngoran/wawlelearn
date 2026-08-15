// WawléLearn — Page Cours v2 : déblocage progressif
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}

(async () => {
  const grid = document.getElementById("grille-lecons");
  const tabs = document.getElementById("tabs");
  const bandeau = document.getElementById("bandeau-premium");
  if (!grid || !tabs) return;

  const profInfo = await wlGetProfile();
  const premium = profInfo.plan === "premium" || profInfo.plan === "institution";
  const bypass = profInfo.role === "admin" || profInfo.unlockAll;

  let data = null;
  try { data = await (await fetch("data/lessons.json")).json(); }
  catch (e) { grid.appendChild(el("p", "msg", "Impossible de charger les leçons.")); return; }

  const completed = await wlGetCompleted(profInfo.session);
  const unlocked = wlComputeUnlocked(data.niveaux, completed, premium, bypass);

  if (!premium && bandeau) bandeau.hidden = false;

  const filtres = ["Tous", "A1", "A2", "B1", "B2"];
  filtres.forEach((f) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = (f === "Tous") ? "🌍 Tous" : f;
    if (f === "Tous") b.classList.add("actif");
    b.addEventListener("click", () => {
      tabs.querySelectorAll("button").forEach((x) => x.classList.remove("actif"));
      b.classList.add("actif");
      rendre(f);
    });
    tabs.appendChild(b);
  });

  function rendre(filtre) {
    grid.textContent = "";
    data.niveaux.forEach((niv, ni) => {
      if (filtre !== "Tous" && niv.code !== filtre) return;
      const sec = el("section", "section");
      sec.appendChild(el("h2", "titre-niveau", niv.code + " — " + niv.nom));
      const g = el("div", "grid");

      niv.lecons.forEach((lec, i) => {
        const card = el("div", "card lecon-card");
        const done = completed.has(lec.id);
        const open = unlocked.has(lec.id);
        const premiumLock = niv.premium && !premium && profInfo.role !== "admin";

        let badge = "badge", txt;
        if (done) txt = "✅ Terminée";
        else if (open) txt = niv.premium ? "⭐ Premium" : "🌱 Gratuit";
        else if (premiumLock) { txt = "🔒 Premium"; badge += " lock"; }
        else { txt = "🔒 À débloquer"; badge += " lock"; }
        card.appendChild(el("span", badge, txt));
        card.appendChild(el("h3", null, lec.titre));

        if (open) {
          const a = el("a", "btn", done ? "Revoir la leçon" : "Ouvrir la leçon");
          a.href = "lecon.html?id=" + encodeURIComponent(lec.id);
          card.appendChild(a);
        } else if (premiumLock) {
          card.appendChild(el("p", "mots", "Réservé aux abonnés Premium — 2 500 CFA/mois"));
          const a = el("a", "btn ghost", "Débloquer ce niveau");
          a.href = "tarifs.html";
          card.appendChild(a);
        } else {
          const prevTitre = (i > 0)
            ? niv.lecons[i - 1].titre
            : (ni > 0 ? data.niveaux[ni - 1].lecons[data.niveaux[ni - 1].lecons.length - 1].titre : "la leçon précédente");
          card.appendChild(el("p", "mots", "Termine d'abord : " + prevTitre));
          const b = el("button", "btn", "🔒 Verrouillé");
          b.disabled = true;
          card.appendChild(b);
        }
        g.appendChild(card);
      });

      sec.appendChild(g);
      grid.appendChild(sec);
    });
  }

  rendre("Tous");
})();
