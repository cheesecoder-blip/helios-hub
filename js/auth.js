/* =========================================================
   HELIOS HUB V11 - AUTHENTICATION MODULE & DATABASE CHECK
   ========================================================= */

function getCurrentUser() {
  const sessionStr = localStorage.getItem("helios_session");
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}

function setCurrentUser(userObj) {
  if (!userObj) {
    localStorage.removeItem("helios_session");
  } else {
    localStorage.setItem("helios_session", JSON.stringify(userObj));
  }
}

async function handleSignUp(email, password, fullName, username, section, circleOfFriends) {
  const cleanEmail = email.toLowerCase().trim();
  const cleanUsername = (username || cleanEmail.split("@")[0]).trim();
  
  let newUser = {
    id: "usr_" + Date.now(),
    email: cleanEmail,
    full_name: fullName,
    username: cleanUsername,
    section: section || "Helios",
    circle_of_friends: circleOfFriends || "FF",
    avatar_url: null,
    avatar_transform: { zoom: 1, x: 0, y: 0 },
    created_at: new Date().toISOString()
  };

  if (supabaseClient) {
    try {
      // 1. Register with Supabase Auth
      const { data, error } = await supabaseClient.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
            username: cleanUsername,
            section: newUser.section,
            circle_of_friends: newUser.circle_of_friends
          }
        }
      });

      if (data && data.user) {
        newUser.id = data.user.id;
      }

      // 2. Upsert into Supabase public.profiles & public.registered_users
      await supabaseClient.from("profiles").upsert({
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.full_name,
        section: newUser.section,
        circle_of_friends: newUser.circle_of_friends
      });

      await supabaseClient.from("registered_users").upsert({
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        section: newUser.section,
        circle_of_friends: newUser.circle_of_friends
      });
    } catch (err) {
      console.warn("Supabase sign up notice:", err);
    }
  }

  // Save to local registry database
  let usersList = JSON.parse(localStorage.getItem("helios_users_db") || "[]");
  usersList = usersList.filter(u => u.email !== newUser.email);
  usersList.push(newUser);
  localStorage.setItem("helios_users_db", JSON.stringify(usersList));

  // Set current active session & redirect
  setCurrentUser(newUser);
  alert("Account registered successfully! Redirecting to Dashboard...");
  window.location.href = "dashboard.html";
}

async function handleSignIn(emailOrUsername, password) {
  const cleanInput = emailOrUsername.toLowerCase().trim();
  let userProfile = null;

  // 1. Try Supabase Auth Sign In first
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: cleanInput,
        password: password
      });

      if (!error && data && data.user) {
        const { data: prof } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        userProfile = {
          id: data.user.id,
          email: cleanInput,
          full_name: prof?.full_name || data.user.user_metadata?.full_name || cleanInput.split("@")[0],
          username: prof?.username || cleanInput.split("@")[0],
          section: prof?.section || "Helios",
          circle_of_friends: prof?.circle_of_friends || "FF",
          avatar_url: prof?.avatar_url || null,
          avatar_transform: prof?.avatar_transform || { zoom: 1, x: 0, y: 0 }
        };
      } else {
        // Query profiles directly by email or username
        const { data: profMatch } = await supabaseClient
          .from("profiles")
          .select("*")
          .or(`username.eq.${cleanInput},full_name.ilike.%${cleanInput}%`);

        if (profMatch && profMatch.length > 0) {
          const p = profMatch[0];
          userProfile = {
            id: p.id,
            email: cleanInput,
            full_name: p.full_name,
            username: p.username || cleanInput,
            section: p.section || "Helios",
            circle_of_friends: p.circle_of_friends || "FF",
            avatar_url: p.avatar_url || null,
            avatar_transform: p.avatar_transform || { zoom: 1, x: 0, y: 0 }
          };
        }
      }
    } catch (e) {
      console.warn("Supabase auth check:", e);
    }
  }

  // 2. Fallback to Local Users Registry Database
  if (!userProfile) {
    const usersList = JSON.parse(localStorage.getItem("helios_users_db") || "[]");
    const match = usersList.find(u => u.email === cleanInput || u.username.toLowerCase() === cleanInput);
    if (match) {
      userProfile = match;
    }
  }

  // 3. Database Check Guard: If user is NOT in registered database, reject sign-in!
  if (!userProfile) {
    alert("Sign in failed: Account not found in registered database. Please sign up first!");
    return;
  }

  // Set session & redirect
  setCurrentUser(userProfile);
  window.location.href = "dashboard.html";
}

function handleSignOut() {
  if (supabaseClient) {
    try {
      supabaseClient.auth.signOut();
    } catch (e) {}
  }
  localStorage.removeItem("helios_session");
  window.location.href = "login.html";
}

function enforceAuthGuard(pageType) {
  const user = getCurrentUser();
  const path = window.location.pathname.toLowerCase();

  if (pageType === "protected" && !user) {
    if (!path.endsWith("login.html")) {
      window.location.href = "login.html";
    }
  } else if (pageType === "login" && user) {
    if (!path.endsWith("dashboard.html")) {
      window.location.href = "dashboard.html";
    }
  } else if (pageType === "index") {
    if (user) {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "login.html";
    }
  }
}
