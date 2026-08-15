// Navigation intelligente + lien admin dynamique
(async () => {
  const guest = document.getElementById("nav-guest");
  const user = document.getElementById("nav-user");
  if (!guest || !user) return;

  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      guest.hidden = true;
      user.hidden = false;

      const { data: prof } = await sb
        .from("profiles")
        .select("full_name, role")
        .eq("id", session.user.id)
        .single();

      const nameEl = document.getElementById("nav-username");
      const fullName = (prof && prof.full_name) ||
        (session.user.user_metadata && session.user.user_metadata.full_name);
      if (nameEl && fullName) nameEl.textContent = fullName; // textContent = anti-XSS

      if (prof && prof.role === "admin") {
        const a = document.createElement("a");
        a.href = "admin.html";
        a.textContent = "🛠️ Admin";
        const links = document.querySelector(".nav-links");
        if (links) links.appendChild(a);
      }

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
