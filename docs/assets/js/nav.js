// WawléLearn — nav v6 : badge AO + favicon + avatar + proverbes + admin discret
(function () {
  // Badge carré orange "AO HUB" (remplace JW HUB de l'exemple)
  const brand = document.querySelector(".brand");
  if (brand && !brand.querySelector(".logo-badge")) {
    const b = document.createElement("span");
    b.className = "logo-badge";
    b.setAttribute("aria-hidden", "true");
    const t1 = document.createElement("span");
    t1.textContent = "AO";
    const t2 = document.createElement("span");
    t2.textContent = "HUB";
    b.appendChild(t1);
    b.appendChild(t2);
    brand.prepend(b);
  }

  // Favicon : carré orange AO (SVG data URI, pas d'image à uploader)
  if (!document.querySelector('link[rel="icon"]')) {
    const l = document.createElement("link");
    l.rel = "icon";
    l.href = "data:image/svg+xml," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>" +
      "<rect width='64' height='64' rx='12' fill='#ff7e00'/>" +
      "<text x='32' y='31' font-family='Arial,Helvetica,sans-serif' font-size='26' font-weight='700' fill='#fff' text-anchor='middle'>AO</text>" +
      "<text x='32' y='52' font-family='Arial,Helvetica,sans-serif' font-size='14' font-weight='600' fill='#fff' text-anchor='middle'>HUB</text>" +
      "</svg>"
    );
    document.head.appendChild(l);
  }

  // Lien Proverbes pour tous
  const links = document.querySelector(".nav-links");
  if (links && !links.querySelector('a[href="proverbes.html"]')) {
    const p = document.createElement("a");
    p.href = "proverbes.html";
    p.textContent = "📜 Proverbes";
    links.appendChild(p);
  }
})();

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

      const fullName = (prof && prof.full_name) ||
        (session.user.user_metadata && session.user.user_metadata.full_name) ||
        session.user.email || "";

      const nameEl = document.getElementById("nav-username");
      if (nameEl && fullName) nameEl.textContent = fullName;

      // Avatar rond avec l'initiale (comme l'exemple, sans photo)
      if (!user.querySelector(".avatar")) {
        const av = document.createElement("span");
        av.className = "avatar";
        av.textContent = fullName.trim().charAt(0).toUpperCase() || "?";
        user.insertBefore(av, user.firstChild);
      }

      if (prof && prof.role === "admin") {
        const footer = document.querySelector("footer");
        if (footer && !document.querySelector(".admin-dot")) {
          const a = document.createElement("a");
          a.href = "admin.html";
          a.className = "admin-dot";
          a.textContent = "⚙️";
          a.title = "Administration";
          footer.appendChild(a);
        }
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
