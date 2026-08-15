// =====================================================
// WawléLearn — Authentification sécurisée
// Règles : jamais innerHTML (anti-XSS), erreurs génériques,
// validation côté client ET côté serveur (Supabase + RLS).
// =====================================================

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text; // textContent = pas d'injection HTML
}

function setMsg(id, text, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("ok", !!ok);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  if (!phone) return true; // optionnel
  return /^\+?[0-9 .-]{8,20}$/.test(phone);
}

function messageErreurSignup(message) {
  if (!message) return "Inscription impossible. Réessaie plus tard.";
  const m = message.toLowerCase();
  if (m.includes("already")) return "Un compte existe déjà avec cet email.";
  if (m.includes("password")) return "Mot de passe trop faible (8 caractères minimum).";
  if (m.includes("rate")) return "Trop de tentatives. Attends quelques minutes.";
  return "Inscription impossible. Vérifie tes informations.";
}

// ---------------- INSCRIPTION ----------------
const signupForm = document.getElementById("form-inscription");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullName = document.getElementById("nom").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const password = document.getElementById("motdepasse").value;
    const cgu = document.getElementById("cgu").checked;

    if (fullName.length < 2) return setMsg("msg-inscription", "Entre ton nom complet.");
    if (fullName.length > 80) return setMsg("msg-inscription", "Nom trop long (80 caractères max).");
    if (!validateEmail(email)) return setMsg("msg-inscription", "Adresse email invalide.");
    if (password.length < 8) return setMsg("msg-inscription", "Mot de passe : 8 caractères minimum.");
    if (!validatePhone(whatsapp)) return setMsg("msg-inscription", "Numéro WhatsApp invalide (ex : +225 07 00 00 00 00).");
    if (!cgu) return setMsg("msg-inscription", "Tu dois accepter les CGU.");

    const { data, error } = await sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: fullName, whatsapp_number: whatsapp } }
    });

    if (error) return setMsg("msg-inscription", messageErreurSignup(error.message));

    if (data.session) {
      window.location.href = "tableau-de-bord.html";
    } else {
      setMsg("msg-inscription", "Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi.", true);
      signupForm.reset();
    }
  });
}

// ---------------- CONNEXION ----------------
const loginForm = document.getElementById("form-connexion");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("motdepasse").value;

    const { error } = await sb.auth.signInWithPassword({ email: email, password: password });
    if (error) {
      // Message volontairement générique (anti-énumération de comptes)
      return setMsg("msg-connexion", "Email ou mot de passe incorrect.");
    }
    window.location.href = "tableau-de-bord.html";
  });
}

// ---------------- TABLEAU DE BORD (page protégée) ----------------
const dashboard = document.getElementById("dashboard");
if (dashboard) {
  (async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      window.location.href = "connexion.html"; // pas connecté = dehors
      return;
    }
    setText("user-email", session.user.email || "");

    const { data: profile } = await sb
      .from("profiles")
      .select("full_name, plan, points, lessons_completed, streak_days")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      setText("user-name", profile.full_name || "Étudiant");
      setText("user-plan", profile.plan || "free");
      setText("stat-points", String(profile.points ?? 0));
      setText("stat-lecons", String(profile.lessons_completed ?? 0));
      setText("stat-serie", String(profile.streak_days ?? 0));
    }
  })();

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      window.location.href = "index.html";
    });
  }
}
