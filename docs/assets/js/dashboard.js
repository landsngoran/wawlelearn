// WawléLearn — Tableau de bord "hub" (données réelles)
(async () => {
  const nameEl = document.getElementById("dash-name");
  if (!nameEl) return;

  const profInfo = await wlGetProfile();
  if (!profInfo.session) { window.location.href = "connexion.html"; return; }

  const { data: prof } = await sb
    .from("profiles")
    .select("full_name, plan, points, lessons_completed, streak_days, whatsapp_number, role")
    .eq("id", profInfo.session.user.id)
    .single();

  const fullName = (prof && prof.full_name) || "Étudiant";
  const h = new Date().getHours();
  document.getElementById("dash-bonjour").textContent = (h >= 18 || h < 5) ? "Bonsoir" : "Bonjour";
  nameEl.textContent = fullName;
  const av = document.getElementById("dash-avatar");
  if (av) av.textContent = fullName.trim().charAt(0).toUpperCase() || "?";

  // Carte Personnel
  document.getElementById("card-name").textContent = fullName;
  document.getElementById("stat-line").textContent =
    "⭐ " + (prof.points || 0) + " pts · ✅ " + (prof.lessons_completed || 0) + "/29 leçons · 🔥 " + (prof.streak_days || 0) + " j";
  document.getElementById("plan-line").textContent = "Plan : " + (prof.plan || "free");
  if (prof.plan === "premium" || prof.plan === "institution") {
    const lp = document.getElementById("link-premium");
    if (lp) lp.hidden = true;
  }
  document.getElementById("whats-line").textContent = "WhatsApp : " + (prof.whatsapp_number || "non renseigné");
  if (prof.role === "admin") {
    const qa = document.getElementById("quick-admin");
    if (qa) qa.hidden = false;
  }

  // Prochaine leçon (bandeau Tâches)
  let data = null;
  try { data = await (await fetch("data/lessons.json")).json(); } catch (e) { /* hors ligne */ }
  const completed = await wlGetCompleted(profInfo.session);
  const premium = prof.plan === "premium" || prof.plan === "institution";
  const bypass = prof.role === "admin" || profInfo.unlockAll;
  const unlocked = data ? wlComputeUnlocked(data.niveaux, completed, premium, bypass) : new Set();

  let next = null;
  if (data) {
    outer:
    for (const niv of data.niveaux) {
      for (const lec of niv.lecons) {
        if (!completed.has(lec.id) && unlocked.has(lec.id)) { next = { niv: niv, lec: lec }; break outer; }
      }
    }
  }
  const task = document.getElementById("task-next");
  const linkNext = document.getElementById("link-next");
  if (next) {
    task.textContent = "▶ ";
    const a = document.createElement("a");
    a.href = "lecon.html?id=" + encodeURIComponent(next.lec.id);
    a.textContent = "Reprendre : " + next.niv.code + " — " + next.lec.titre;
    task.appendChild(a);
    if (linkNext) linkNext.href = a.href;
  } else {
    task.textContent = "🎉 Toutes les leçons disponibles sont terminées !";
    if (linkNext) linkNext.hidden = true;
  }

  // Recherche de leçons
  const q = document.getElementById("dash-q");
  const res = document.getElementById("dash-results");
  if (q && res && data) {
    q.addEventListener("input", () => {
      res.textContent = "";
      const s = q.value.trim().toLowerCase();
      if (s.length < 2) return;
      const hits = [];
      data.niveaux.forEach((niv) => niv.lecons.forEach((lec) => {
        if (hits.length < 6 && lec.titre.toLowerCase().includes(s)) hits.push({ niv: niv, lec: lec });
      }));
      hits.forEach((hit) => {
        const a = document.createElement("a");
        a.href = "lecon.html?id=" + encodeURIComponent(hit.lec.id);
        a.textContent = hit.niv.code + " — " + hit.lec.titre + (unlocked.has(hit.lec.id) ? "" : " 🔒");
        res.appendChild(a);
      });
      if (!hits.length) {
        const p = document.createElement("span");
        p.className = "muted";
        p.textContent = "Aucune leçon trouvée.";
        res.appendChild(p);
      }
    });
  }

  // Compte et sécurité
  const btnPass = document.getElementById("btn-reset-pass");
  if (btnPass) btnPass.addEventListener("click", async () => {
    const { error } = await sb.auth.resetPasswordForEmail(profInfo.session.user.email, {
      redirectTo: "https://landsngoran.github.io/wawlelearn/"
    });
    btnPass.textContent = error ? "Erreur, réessaie plus tard." : "📧 Email de réinitialisation envoyé.";
  });

  const btnOut = document.getElementById("btn-logout2");
  if (btnOut) btnOut.addEventListener("click", async () => {
    await sb.auth.signOut();
    window.location.href = "index.html";
  });

  // Proverbe du jour (colonne latérale)
  const sp = document.getElementById("side-prov");
  if (sp) {
    const { data: provs } = await sb.from("proverbes").select("baoule, francais").order("id").limit(100);
    if (provs && provs.length) {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const d = Math.floor((now - start) / 86400000);
      const p = provs[d % provs.length];
      sp.textContent = p.baoule + " — " + p.francais;
    } else {
      sp.textContent = "Les proverbes arrivent bientôt.";
    }
  }
})();
