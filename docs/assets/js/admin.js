// WawléLearn — Admin : import / export CSV du vocabulaire
// Garde-fou client (cosmétique) + RLS serveur (le vrai verrou).

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}

function parseCSV(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const rows = [];
  for (const line of lines) {
    const sep = (line.includes(";") && !line.includes(",")) ? ";" : ",";
    const parts = line.split(sep).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length >= 2) rows.push({ b: parts[0], f: parts[1] });
  }
  return rows;
}

function csvEscape(v) {
  v = String(v == null ? "" : v);
  if (/[",;\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

(async () => {
  const root = document.getElementById("admin");
  if (!root) return;

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = "connexion.html"; return; }

  const { data: prof } = await sb
    .from("profiles").select("role").eq("id", session.user.id).single();
  if (!prof || prof.role !== "admin") {
    root.appendChild(el("h2", null, "⛔ Accès réservé"));
    root.appendChild(el("p", null, "Cette page est réservée à l'administrateur de WawléLearn."));
    return;
  }

  root.appendChild(el("h2", null, "🛠️ Administration du vocabulaire"));
  const msg = el("p", "msg");
  root.appendChild(msg);
  function dire(t, ok) { msg.textContent = t; msg.classList.toggle("ok", !!ok); }

  // --- Niveau + leçon cibles
  let lessonsData = null;
  try { lessonsData = await (await fetch("data/lessons.json")).json(); } catch (e) { /* liste vide */ }

  root.appendChild(el("label", null, "Niveau cible"));
  const selNiveau = el("select");
  ["A1", "A2", "B1", "B2"].forEach((n) => selNiveau.appendChild(el("option", null, n)));
  root.appendChild(selNiveau);

  root.appendChild(el("label", null, "Leçon cible"));
  const selLecon = el("select");
  function refreshLecons() {
    selLecon.textContent = "";
    if (!lessonsData) return;
    const niv = lessonsData.niveaux.find((n) => n.code === selNiveau.value);
    if (!niv) return;
    niv.lecons.forEach((l) => {
      const o = el("option", null, l.titre);
      o.value = l.id;
      selLecon.appendChild(o);
    });
  }
  selNiveau.addEventListener("change", refreshLecons);
  refreshLecons();
  root.appendChild(selLecon);

  // --- Import CSV
  root.appendChild(el("label", null, "Fichier CSV (baoule,francais)"));
  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".csv,text/csv,text/plain";
  root.appendChild(file);

  const rowBtns = el("div", "admin-row");
  const btnImport = el("button", "btn", "⬆️ Importer le CSV");
  const btnExport = el("button", "btn ghost", "⬇️ Télécharger le CSV");
  const btnModele = el("button", "btn ghost", "📄 Modèle CSV");
  rowBtns.appendChild(btnImport); rowBtns.appendChild(btnExport); rowBtns.appendChild(btnModele);
  root.appendChild(rowBtns);

  btnImport.addEventListener("click", async () => {
    const f = file.files && file.files[0];
    if (!f) return dire("Choisis d'abord un fichier CSV.", false);
    if (f.size > 1000000) return dire("Fichier trop lourd (1 Mo max).", false);
    const text = await f.text();
    let rows = parseCSV(text);
    if (rows.length && /baoul/i.test(rows[0].b) && /fran/i.test(rows[0].f)) rows = rows.slice(1);
    rows = rows.filter((r) => r.b && r.f && r.b.length <= 200 && r.f.length <= 300);
    if (!rows.length) return dire("Aucune ligne valide dans ce CSV.", false);
    if (rows.length > 2000) return dire("2 000 lignes maximum par import.", false);

    const payload = rows.map((r) => ({
      niveau: selNiveau.value,
      lecon_id: selLecon.value || null,
      baoule: r.b,
      francais: r.f
    }));

    let ok = 0, ko = 0;
    for (let i = 0; i < payload.length; i += 50) {
      const part = payload.slice(i, i + 50);
      const { error } = await sb.from("vocabulaire").insert(part);
      if (error) ko += part.length; else ok += part.length;
    }
    dire(ok + " mot(s) importé(s), " + ko + " en échec.", ko === 0 && ok > 0);
    apercu();
  });

  // --- Export CSV
  btnExport.addEventListener("click", async () => {
    const { data, error } = await sb
      .from("vocabulaire")
      .select("baoule, francais, niveau, lecon_id")
      .order("id")
      .limit(5000);
    if (error || !data) return dire("Export impossible.", false);
    const lines = ["baoule,francais,niveau,lecon_id"];
    data.forEach((r) => lines.push([r.baoule, r.francais, r.niveau, r.lecon_id || ""].map(csvEscape).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wawlelearn_vocabulaire.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    dire("Export téléchargé (" + data.length + " lignes).", true);
  });

  // --- Modèle
  btnModele.addEventListener("click", () => {
    const blob = new Blob(["\uFEFFbaoule,francais\nMo,Bonjour\nAkwaba,Bienvenue\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modele_vocabulaire.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // --- Aperçu des 10 dernières entrées
  root.appendChild(el("h3", null, "Dernières entrées"));
  const apercuList = el("ul", "liste");
  root.appendChild(apercuList);
  async function apercu() {
    const { data } = await sb
      .from("vocabulaire")
      .select("baoule, francais, niveau, lecon_id")
      .order("id", { ascending: false })
      .limit(10);
    apercuList.textContent = "";
    if (!data || !data.length) {
      apercuList.appendChild(el("li", null, "Aucune entrée pour l'instant."));
      return;
    }
    data.forEach((r) => {
      apercuList.appendChild(el("li", null, r.baoule + " = " + r.francais + "  [" + r.niveau + " · " + (r.lecon_id || "-") + "]"));
    });
  }
  apercu();
})();
