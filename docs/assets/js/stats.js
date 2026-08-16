// WawléLearn — compteurs publics réels (zéro fake)
(async () => {
  const elE = document.getElementById("stat-etudiants");
  const elL = document.getElementById("stat-lecons");
  if (!elE && !elL) return;
  try {
    const { data, error } = await sb.rpc("public_stats");
    if (error || !data) return;
    if (elE) elE.textContent = String(data.etudiants || 0);
    if (elL) elL.textContent = String(data.lecons_terminees || 0);
  } catch (e) { /* silencieux */ }
})();
