// WawléLearn — Page Leçon (affichage + quiz + progression)
// Rendu 100% textContent/createElement (anti-XSS).

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}

(async () => {
  const root = document.getElementById("lecon");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id || !/^[a-z0-9-]{2,20}$/i.test(id)) {
    root.appendChild(el("p", "msg", "Leçon introuvable."));
    return;
  }

  let data;
  try { data = await (await fetch("data/lessons.json")).json(); }
  catch (e) { root.appendChild(el("p", "msg", "Impossible de charger la leçon.")); return; }

  let niveau = null, lecon = null, idx = -1;
  data.niveaux.forEach((niv) => {
    niv.lecons.forEach((lec, i) => {
      if (lec.id === id) { niveau = niv; lecon = lec; idx = i; }
    });
  });
  if (!lecon) { root.appendChild(el("p", "msg", "Leçon introuvable.")); return; }

  // Session + plan
  let session = null, plan = "free";
  try {
    const r = await sb.auth.getSession();
    session = r.data.session;
    if (session) {
      const p = await sb.from("profiles").select("plan").eq("id", session.user.id).single();
      if (p.data && p.data.plan) plan = p.data.plan;
    }
  } catch (e) { /* reste free */ }
  const premium = (plan === "premium" || plan === "institution");

  // Verrou Premium
  if (niveau.premium && !premium) {
    root.appendChild(el("h2", null, "🔐 Contenu Premium"));
    root.appendChild(el("p", null, "Cette leçon est réservée aux abonnés Premium. Débloquez tous les modules A2, B1 et B2 pour 2 500 CFA/mois."));
    const a = el("a", "btn", "Voir les offres Premium");
    a.href = "tarifs.html";
    root.appendChild(a);
    if (!session) {
      const b = el("a", "btn ghost", "Je n'ai pas encore de compte");
      b.href = "inscription.html";
      root.appendChild(b);
    }
    return;
  }

  // En-tête
  root.appendChild(el("span", "badge", niveau.code + " — " + niveau.nom));
  root.appendChild(el("h2", null, lecon.titre));
  if (lecon.note) root.appendChild(el("p", "mots", lecon.note));

  // Mots + quiz
  if (!lecon.mots || !lecon.mots.length) {
    root.appendChild(el("p", "mots", "[contenu à fournir]"));
  } else {
    const ul = el("ul", "liste");
    lecon.mots.forEach((m) => {
      const li = el("li");
      li.appendChild(el("b", null, m.b));
      li.appendChild(document.createTextNode(" = " + m.f));
      ul.appendChild(li);
    });
    root.appendChild(ul);

    root.appendChild(el("h3", null, "✍️ Petit quiz"));
    const quiz = el("div", "quiz");
    const target = lecon.mots[Math.floor(Math.random() * lecon.mots.length)];
    quiz.appendChild(el("p", null, "Comment dit-on « " + target.f.replace(/\s*\(.*\)/, "").trim() + " » en baoulé ?"));
    const choices = [target.b];
    while (choices.length < Math.min(4, lecon.mots.length)) {
      const cand = lecon.mots[Math.floor(Math.random() * lecon.mots.length)].b;
      if (!choices.includes(cand)) choices.push(cand);
    }
    choices.sort(() => Math.random() - 0.5);
    const msg = el("p", "msg");
    choices.forEach((c) => {
      const btn = el("button", "btn ghost", c);
      btn.addEventListener("click", () => {
        if (c === target.b) { msg.textContent = "✅ Bravo !"; msg.classList.add("ok"); }
        else { msg.textContent = "❌ Non, la réponse était « " + target.b + " »."; msg.classList.remove("ok"); }
      });
      quiz.appendChild(btn);
    });
    quiz.appendChild(msg);
    root.appendChild(quiz);
  }

  // Marquer comme terminée
  const done = el("button", "btn", "✅ Marquer comme terminée (+10 pts)");
  done.addEventListener("click", async () => {
    if (!session) { window.location.href = "connexion.html"; return; }
    const { error } = await sb
      .from("lesson_progress")
      .upsert({ user_id: session.user.id, lesson_id: lecon.id }, { onConflict: "user_id,lesson_id" });
    if (error) { msgErreur(done); return; }
    const { count } = await sb
      .from("lesson_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id);
    await sb
      .from("profiles")
      .update({ lessons_completed: count || 0, points: (count || 0) * 10 })
      .eq("id", session.user.id);
    done.disabled = true;
    done.textContent = "Leçon terminée ✔";
  });
  root.appendChild(done);

  function msgErreur(btn) {
    btn.textContent = "Erreur, réessaie plus tard.";
    btn.disabled = true;
  }

  // Navigation précédent / suivant
  const nav = el("div", "nav-lecon");
  if (idx > 0) {
    const p = el("a", null, "← Leçon précédente");
    p.href = "lecon.html?id=" + encodeURIComponent(niveau.lecons[idx - 1].id);
    nav.appendChild(p);
  }
  if (idx < niveau.lecons.length - 1) {
    const n = el("a", null, "Leçon suivante →");
    n.href = "lecon.html?id=" + encodeURIComponent(niveau.lecons[idx + 1].id);
    nav.appendChild(n);
  }
  root.appendChild(nav);
})();
