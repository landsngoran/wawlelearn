// WawléLearn — Admin : déblocage manuel d'un étudiant (soupape)
function elD(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}

(async () => {
  const root = document.getElementById("admin");
  if (!root) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: me } = await sb
    .from("profiles").select("role").eq("id", session.user.id).single();
  if (!me || me.role !== "admin") return;

  root.appendChild(elD("h3", null, "🔓 Déblocage manuel d'un étudiant"));
  root.appendChild(elD("p", "mots", "Pour un étudiant qui connaît déjà la langue : tout s'ouvre, sans fausser ses points."));
  const msg = elD("p", "msg");
  root.appendChild(msg);
  const dire = (t, ok) => { msg.textContent = t; msg.classList.toggle("ok", !!ok); };

  const input = document.createElement("input");
  input.type = "email";
  input.placeholder = "email de l'étudiant";
  input.maxLength = 120;
  root.appendChild(input);

  const info = elD("p", "mots");
  root.appendChild(info);

  const row = elD("div", "admin-row");
  const bFind = elD("button", "btn ghost", "🔍 Trouver");
  const bOn = elD("button", "btn", "🔓 Tout débloquer");
  const bOff = elD("button", "btn ghost", "🔁 Parcours normal");
  [bFind, bOn, bOff].forEach((b) => row.appendChild(b));
  root.appendChild(row);

  let target = null;

  function rafraichir() {
    if (!target) return;
    info.textContent = "👤 " + (target.full_name || "-") +
      " · plan " + target.plan +
      " · déblocage total : " + (target.unlock_all ? "OUI" : "non");
  }

  bFind.addEventListener("click", async () => {
    const email = input.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return dire("Email invalide.", false);
    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, plan, unlock_all")
      .ilike("email", email)
      .limit(1);
    if (error || !data || !data.length) return dire("Aucun étudiant trouvé avec cet email.", false);
    target = data[0];
    rafraichir();
    dire("Étudiant trouvé.", true);
  });

  async function setUnlock(v) {
    if (!target) return dire("Trouve d'abord un étudiant.", false);
    const { error } = await sb.from("profiles").update({ unlock_all: v }).eq("id", target.id);
    if (error) return dire("Mise à jour impossible.", false);
    target.unlock_all = v;
    rafraichir();
    dire(v ? "Parcours entièrement débloqué pour cet étudiant." : "Parcours progressif rétabli.", true);
  }
  bOn.addEventListener("click", () => setUnlock(true));
  bOff.addEventListener("click", () => setUnlock(false));
})();
