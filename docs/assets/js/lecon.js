// WawléLearn — Page Leçon v4 : verrous + quiz obligatoire + progression
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}
function melanger(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function cleanF(s) { return String(s).replace(/\s*\(.*\)/, "").trim(); }

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

  let niveau = null, lecon = null, idx = -1, ni = -1;
  data.niveaux.forEach((niv, a) => {
    niv.lecons.forEach((lec, i) => {
      if (lec.id === id) { niveau = niv; lecon = lec; idx = i; ni = a; }
    });
  });
  if (!lecon) { root.appendChild(el("p", "msg", "Leçon introuvable.")); return; }

  const profInfo = await wlGetProfile();
  const session = profInfo.session;
  const premium = profInfo.plan === "premium" || profInfo.plan === "institution";
  const bypass = profInfo.role === "admin" || profInfo.unlockAll;
  const completed = await wlGetCompleted(session);
  const unlocked = wlComputeUnlocked(data.niveaux, completed, premium, bypass);

  // ----- VERROUS -----
  if (!unlocked.has(lecon.id)) {
    if (niveau.premium && !premium && profInfo.role !== "admin") {
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
    } else {
      root.appendChild(el("h2", null, "🔒 Leçon verrouillée"));
      let prevTitre = null, prevId = null;
      if (idx > 0) { prevTitre = niveau.lecons[idx - 1].titre; prevId = niveau.lecons[idx - 1].id; }
      else if (ni > 0) {
        const pn = data.niveaux[ni - 1];
        prevTitre = pn.lecons[pn.lecons.length - 1].titre;
        prevId = pn.lecons[pn.lecons.length - 1].id;
      }
      root.appendChild(el("p", null, "Le déblocage est progressif. Termine d'abord : " + (prevTitre || "la leçon précédente") + "."));
      if (prevId) {
        const a = el("a", "btn", "Aller à : " + prevTitre);
        a.href = "lecon.html?id=" + encodeURIComponent(prevId);
        root.appendChild(a);
      }
      const c = el("a", "btn ghost", "Voir mes cours");
      c.href = "cours.html";
      root.appendChild(c);
    }
    return;
  }

  // ----- CONTENU -----
  root.appendChild(el("span", "badge", niveau.code + " — " + niveau.nom));
  root.appendChild(el("h2", null, lecon.titre));

  let mots = [];
  try {
    const { data: rows } = await sb
      .from("vocabulaire")
      .select("baoule, francais")
      .eq("lecon_id", lecon.id)
      .order("id")
      .limit(300);
    if (rows && rows.length) mots = rows.map((r) => ({ b: r.baoule, f: r.francais }));
  } catch (e) { /* repli JSON */ }
  if (!mots.length && lecon.mots && lecon.mots.length) mots = lecon.mots;

  // ----- BOUTON TERMINER (créé tôt, état géré ensuite) -----
  const done = el("button", "btn", "✅ Marquer comme terminée (+10 pts)");

  if (!mots.length) {
    root.appendChild(el("p", "mots", "[contenu à fournir — importe-le via la page Admin]"));
    done.disabled = true;
    done.textContent = "Contenu en préparation";
  } else {
    const ul = el("ul", "liste");
    mots.forEach((m) => {
      const li = el("li");
      li.appendChild(el("b", null, m.b));
      li.appendChild(document.createTextNode(" = " + m.f));
      ul.appendChild(li);
    });
    root.appendChild(ul);

    // ----- QUIZ OBLIGATOIRE (3/5) -----
    root.appendChild(el("h3", null, "✍️ Quiz obligatoire — 3 bonnes réponses pour valider"));
    const quizZone = el("div");
    const resultat = el("p", "msg");
    const btnRetry = el("button", "btn ghost", "🔄 Réessayer");
    btnRetry.hidden = true;
    root.appendChild(quizZone);
    root.appendChild(resultat);
    root.appendChild(btnRetry);

    const SEUIL = 3;
    let score = 0, repondues = 0, totalQ = 0;

    function construireQuiz() {
      quizZone.textContent = "";
      resultat.textContent = "";
      resultat.classList.remove("ok");
      btnRetry.hidden = true;
      done.disabled = true;
      done.textContent = "✅ Marquer comme terminée (+10 pts)";
      score = 0; repondues = 0;
      const qs = melanger(mots).slice(0, Math.min(5, mots.length));
      totalQ = qs.length;
      const seuilReel = Math.min(SEUIL, totalQ);

      qs.forEach((cible, qi) => {
        const q = el("div", "quiz");
        q.appendChild(el("p", null, (qi + 1) + ". Comment dit-on « " + cleanF(cible.f) + " » en baoulé ?"));
        const choices = [cible.b];
        while (choices.length < Math.min(4, mots.length)) {
          const cand = mots[Math.floor(Math.random() * mots.length)].b;
          if (!choices.includes(cand)) choices.push(cand);
        }
        melanger(choices).forEach((c) => {
          const b = el("button", "btn ghost", c);
          b.addEventListener("click", () => {
            q.querySelectorAll("button").forEach((x) => { x.disabled = true; });
            if (c === cible.b) { score++; b.classList.add("ok-btn"); }
            else { b.classList.add("ko-btn"); }
            repondues++;
            if (repondues === totalQ) {
              const ok = score >= seuilReel;
              resultat.textContent = "Score : " + score + "/" + totalQ + (ok ? " — ✅ Quiz réussi !" : " — il faut " + seuilReel + " bonne(s) réponse(s).");
              resultat.classList.toggle("ok", ok);
              if (ok) { done.disabled = false; }
              else { btnRetry.hidden = false; }
            }
          });
          q.appendChild(b);
        });
        quizZone.appendChild(q);
      });
    }
    btnRetry.addEventListener("click", construireQuiz);
    construireQuiz();
  }

  done.addEventListener("click", async () => {
    if (!session) { window.location.href = "connexion.html"; return; }
    const { error } = await sb
      .from("lesson_progress")
      .upsert({ user_id: session.user.id, lesson_id: lecon.id }, { onConflict: "user_id,lesson_id" });
    if (error) { done.textContent = "Erreur, réessaie plus tard."; done.disabled = true; return; }
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
    window.location.href = "cours.html";
  });
  root.appendChild(done);

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
