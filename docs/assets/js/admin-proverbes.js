// WawléLearn — Admin : import / export CSV des proverbes
function elP(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}
function parseCSVP(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const out = [];
  for (const line of lines) {
    const sep = (line.includes(";") && !line.includes(",")) ? ";" : ",";
    out.push(line.split(sep).map((p) => p.trim().replace(/^"|"$/g, "")));
  }
  return out;
}
function csvEscapeP(v) {
  v = String(v == null ? "" : v);
  if (/[",;\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

(async () => {
  const root = document.getElementById("admin");
  if (!root) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: prof } = await sb
    .from("profiles").select("role").eq("id", session.user.id).single();
  if (!prof || prof.role !== "admin") return;

  root.appendChild(elP("h3", null, "📜 Proverbes baoulé"));
  root.appendChild(elP("p", "mots", "CSV : baoule,francais[,source] — une ligne par proverbe. N'importe que des proverbes vérifiés."));
  const msg = elP("p", "msg");
  root.appendChild(msg);
  const dire = (t, ok) => { msg.textContent = t; msg.classList.toggle("ok", !!ok); };

  const file = document.createElement("input");
  file.type = "file";
  file.accept = ".csv,text/csv,text/plain";
  root.appendChild(file);

  const row = elP("div", "admin-row");
  const bI = elP("button", "btn", "⬆️ Importer les proverbes");
  const bE = elP("button", "btn ghost", "⬇️ Télécharger les proverbes");
  const bM = elP("button", "btn ghost", "📄 Modèle CSV");
  [bI, bE, bM].forEach((b) => row.appendChild(b));
  root.appendChild(row);

  bI.addEventListener("click", async () => {
    const f = file.files && file.files[0];
    if (!f) return dire("Choisis d'abord un fichier CSV.", false);
    if (f.size > 1000000) return dire("Fichier trop lourd (1 Mo max).", false);
    let rows = parseCSVP(await f.text());
    if (rows.length && /baoul/i.test(rows[0][0])) rows = rows.slice(1);
    if (rows.length > 1000) return dire("1 000 proverbes max par import.", false);

    const payload = [];
    let bad = 0;
    rows.forEach((p) => {
      const b = p[0], fr = p[1], src = p[2] || null;
      if (!b || !fr || b.length > 500 || fr.length > 500 || (src && src.length > 120)) { bad++; return; }
      payload.push({ baoule: b, francais: fr, source: src });
    });
    if (!payload.length) return dire("Aucune ligne valide.", false);

    let ok = 0, ko = 0;
    for (let i = 0; i < payload.length; i += 50) {
      const part = payload.slice(i, i + 50);
      const { error } = await sb.from("proverbes").insert(part);
      if (error) ko += part.length; else ok += part.length;
    }
    dire(ok + " proverbe(s) importé(s), " + (ko + bad) + " écarté(s).", ko === 0 && ok > 0);
    apercuP();
  });

  bE.addEventListener("click", async () => {
    const { data, error } = await sb
      .from("proverbes").select("baoule, francais, source").order("id").limit(2000);
    if (error || !data) return dire("Export impossible.", false);
    const lines = ["baoule,francais,source"];
    data.forEach((r) => lines.push([r.baoule, r.francais, r.source || ""].map(csvEscapeP).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wawlelearn_proverbes.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    dire("Export téléchargé (" + data.length + " proverbes).", true);
  });

  bM.addEventListener("click", () => {
    const blob = new Blob(["\uFEFFbaoule,francais,source\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modele_proverbes.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  root.appendChild(elP("h3", null, "Derniers proverbes"));
  const list = elP("ul", "liste");
  root.appendChild(list);
  async function apercuP() {
    const { data } = await sb
      .from("proverbes").select("baoule, francais")
      .order("id", { ascending: false }).limit(5);
    list.textContent = "";
    if (!data || !data.length) { list.appendChild(elP("li", null, "Aucun proverbe pour l'instant.")); return; }
    data.forEach((r) => list.appendChild(elP("li", null, r.baoule + " — " + r.francais)));
  }
  apercuP();
})();
