// Navigation intelligente : affiche Connexion/Inscription ou Nom/Déconnexion
(async () => {
  const guest = document.getElementById("nav-guest");
  const user = document.getElementById("nav-user");
  if (!guest || !user) return;

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      guest.hidden = true;
      user.hidden = false;
      const nameEl = document.getElementById("nav-username");
      const fullName = session.user.user_metadata && session.user.user_metadata.full_name;
      if (nameEl && fullName) nameEl.textContent = fullName; // textContent = anti-XSS
      const logout = document.getElementById("nav-logout");
      if (logout) logout.addEventListener("click", async () => {
        await sb.auth.signOut();
        window.location.href = "index.html";
      });
    } else {
      guest.hidden = false;
      user.hidden = true;
    }
  } catch (e) {
    guest.hidden = false;
    user.hidden = true;
  }
})();
