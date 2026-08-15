// WawléLearn — Page Cours
// Verrou Premium CÔTÉ CLIENT (affichage seulement).
// IMPORTANT : quand le vrai contenu existera, les leçons payantes
// devront vivre dans Supabase avec RLS, pas dans un fichier public.

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

  // 1) Plan de l'utilisateur connecté
  let plan = "free";
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      const { data: prof } = await sb
        .from("profiles")
        .select("plan")
        .eq("id", session.user.id)
        .single();
      if (prof && prof.plan) plan = prof.plan;
    }
  } catch (e) { /* reste free */ }
  const premium = (plan === "premium" || plan === "institution");

  // 2) Chargement du contenu
  let data = null;
  try {
    const res = await fetch("data/lessons.json");
    data = await res.json();
  } catch (e) {
    grid.appendChild(el("p", "msg", "Impossible de charger les leçons."));
    return;
  }

  if (!premium && bandeau) bandeau.hidden = false;

  // 3) Onglets de filtre
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

  // 4) Rendu (100% textContent, anti-XSS)
  function rendre(filtre) {
    grid.textContent = "";
    data.niveaux.forEach((niv) => {
      if (filtre !== "Tous" && niv.code !== filtre) return;
      const sec = el("section", "section");
      sec.appendChild(el("h2", "titre-niveau", niv.code + " — " + niv.nom));
      const g = el("div", "grid");
      const verrouilleNiveau = niv.premium && !premium;

      niv.lecons.forEach((lec) => {
        const card = el("div", "card lecon-card");
        card.appendChild(el("span", "badge" + (verrouilleNiveau ? " lock" : ""),
          verrouilleNiveau ? "🔒 Premium" : (niv.premium ? "✅ Débloqué" : "🌱 Gratuit")));
        card.appendChild(el("h3", null, lec.titre));

        if (verrouilleNiveau) {
          card.appendChild(el("p", "mots", "Réservé aux abonnés Premium — 2 500 CFA/mois"));
          const a = el("a", "btn ghost", "Débloquer ce niveau");
          a.href = "tarifs.html";
          card.appendChild(a);
        } else {
          if (lec.mots && lec.mots.length) {
            card.appendChild(el("p", "mots", lec.mots.length + " mot(s) d'aperçu — " + (lec.note || "contenu provisoire")));
          } else {
            card.appendChild(el("p", "mots", "[contenu à fournir]"));
          }
          const a = el("a", "btn", "Ouvrir la leçon");
          a.href = "lecon.html?id=" + encodeURIComponent(lec.id);
          card.appendChild(a);
        }
        g.appendChild(card);
      });

      sec.appendChild(g);
      grid.appendChild(sec);
    });
  }

  rendre("Tous");
})();
