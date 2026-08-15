// WawléLearn — Progression & déblocage progressif (partagé)

async function wlGetProfile() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return { session: null, plan: "free", role: "etudiant", unlockAll: false };
    const { data: prof } = await sb
      .from("profiles")
      .select("plan, role, unlock_all")
      .eq("id", session.user.id)
      .single();
    return {
      session: session,
      plan: (prof && prof.plan) || "free",
      role: (prof && prof.role) || "etudiant",
      unlockAll: !!(prof && prof.unlock_all)
    };
  } catch (e) {
    return { session: null, plan: "free", role: "etudiant", unlockAll: false };
  }
}

async function wlGetCompleted(session) {
  const set = new Set();
  if (!session) return set;
  try {
    const { data } = await sb
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", session.user.id);
    (data || []).forEach((r) => set.add(r.lesson_id));
  } catch (e) { /* vide */ }
  return set;
}

// Règles : séquence stricte dans un niveau ;
// niveau suivant = "Révision + test" du précédent terminé ;
// niveaux payants = plan premium ; admin / unlock_all = tout ouvert.
function wlComputeUnlocked(niveaux, completed, premium, bypass) {
  const unlocked = new Set();
  let prevTestDone = false;
  niveaux.forEach((niv, ni) => {
    const levelOpen = bypass || ni === 0 || (premium && prevTestDone);
    if (levelOpen) {
      niv.lecons.forEach((lec, i) => {
        if (bypass) { unlocked.add(lec.id); return; }
        if (i === 0 || completed.has(niv.lecons[i - 1].id) || completed.has(lec.id)) {
          unlocked.add(lec.id);
        }
      });
    }
    prevTestDone = completed.has(niv.lecons[niv.lecons.length - 1].id);
  });
  return unlocked;
}
