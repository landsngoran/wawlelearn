// WawléLearn — Dashboard hub v2 : série réelle, barres, badges calculés
(async () => {
  const nameEl = document.getElementById("dash-name");
  if (!nameEl) return;

  const profInfo = await wlGetProfile();
  if (!profInfo.session) { window.location.href = "connexion.html"; return; }
  const uid = profInfo.session.user.id;

  const { data: prof } = await sb
    .from("profiles")
    .select("full_name, plan, points, lessons_completed, streak_days, whatsapp_number, role")
    .eq("id", uid).single();

  const fullName = (prof && prof.full_name) || "Étudiant";
  const h = new Date().getHours();
  document.getElementById("dash-bonjour").textContent = (h >= 18 || h < 5) ? "Bonsoir" : "Bonjour";
  nameEl.textContent = fullName;
  const av = document.getElementById("dash-avatar");
  if (av) av.textContent = fullName.trim().charAt(0).toUpperCase() || "?";

  document.getElementById("card-name").textContent = fullName;
  document.getElementById("whats-line").textContent = "WhatsApp : " + (prof.whatsapp_number || "non renseigné");
  if (prof.role === "admin") {
    const qa = document.getElementById("quick-admin");
    if (qa) qa.hidden = false;
  }

  // ----- données réelles
  let data = null;
  try { data = await (await fetch("data/lessons.json")).json(); } catch (e) { /* hors ligne */ }
  const completed = await wlGetCompleted(profInfo.session);

  // ----- SÉRIE RÉELLE : jours consécutifs avec au moins une leçon terminée
  function iso(d) { return d.toISOString().slice(0, 10); }
  let streak = 0;
  try {
    const { data: rows } = await sb
      .from("lesson_progress").select("completed_at").eq("user_id", uid);
    const days = [...new Set((rows || []).map((r) => r.completed_at.slice(0, 10)))];
    const cursor = new Date();
    if (!days.includes(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.includes(iso(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  } catch (e) { streak = prof.streak_days || 0; }
  if (streak !== (prof.streak_days || 0)) {
    await sb.from("profiles").update({ streak_days: streak }).eq("id", uid);
  }

  const points = prof.points || 0;
  const total = data ? data.niveaux.reduce((n, niv) => n + niv.lecons.length, 0) : 29;
  const done = completed.size;

  document.getElementById("stat-line").textContent =
    "⭐ " + points + " pts · ✅ " + done + "/" + total + " leçons · 🔥 " + streak + " j";
  document.getElementById("plan-line").textContent = "Plan : " + (prof.plan || "free");
  if (prof.plan === "premium" || prof.plan === "institution") {
    const lp = document.getElementById("link-premium");
    if (lp) lp.hidden = true;
  }

  // ----- BARRES DE PROGRESSION
  const pct = Math.round((done / total) * 100);
  const barG = document.getElementById("bar-global");
  if (barG) barG.style.width = pct + "%";
  const barTxt = document.getElementById("bar-global-txt");
  if (barTxt) barTxt.textContent = pct + "% du parcours complété";
  const barsNiv = document.getElementById("bars-niveaux");
  if (barsNiv && data) {
    data.niveaux.forEach((niv) => {
      const d = niv.lecons.filter((l) => completed.has(l.id)).length;
      const t = niv.lecons.length;
      const line = document.createElement("div");
      line.className = "niv-line";
      const lab = document.createElement("span");
      lab.textContent = niv.code;
      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("i");
      fill.style.width = Math.round((d / t) * 100) + "%";
      bar.appendChild(fill);
      const cnt = document.createElement("span");
      cnt.textContent = d + "/" + t;
      line.appendChild(lab); line.appendChild(bar); line.appendChild(cnt);
      barsNiv.appendChild(line);
    });
  }

  // ----- BADGES CALCULÉS (pas de fake)
  const a1 = data ? data.niveaux[0].lecons : [];
  const a1Done = a1.length > 0 && a1.every((l) => completed.has(l.id));
  const badges = [
    { e: "🌱", t: "Premier pas", ok: done >= 1 },
    { e: "🔥", t: "7 jours de suite", ok: streak >= 7 },
    { e: "📚", t: "10 leçons", ok: done >= 10 },
    { e: "🏆", t: "A1 complet", ok: a1Done },
    { e: "⭐", t: "500 points", ok: points >= 500 }
  ];
  const bWrap = document.getElementById("badges");
  if (bWrap) {
    badges.forEach((b) => {
      const s = document.createElement("span");
      s.className = "badge-item" + (b.ok ? "" : " locked");
      s.textContent = b.e + " ";
      const small = document.createElement("small");
      small.textContent = b.t;
      s.appendChild(small);
      bWrap.appendChild(s);
    });
  }

  // ----- PROCHAINE LEÇON
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

  // ----- RECHERCHE
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

  // ----- COMPTE & SÉCURITÉ
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

  // ----- PROVERBE DU JOUR (honnête si vide)
  const sp = document.getElementById("side-prov");
  if (sp) {
    const { data: provs } = await sb.from("proverbes").select("baoule, francais").order("id").limit(100);
    if (provs && provs.length) {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const d = Math.floor((now - start) / 86400000);
      const p = provs[d % provs.length];
      sp.textContent = p.baoule + " — " + p.francais;
    } else if (prof.role === "admin") {
      sp.textContent = "Admin : importe tes proverbes via ⚙️ pour remplir cette carte.";
    } else {
      sp.textContent = "Bientôt disponible.";
    }
  }
})();
