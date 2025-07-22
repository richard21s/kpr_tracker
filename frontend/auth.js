// // import { AuthClient } from "@dfinity/auth-client";
// import { createActor } from "./declarations/backend";

// let actor;

// // Inisialisasi AuthClient dan Actor
// const initActor = async () => {
//   const auth = await AuthClient.create();
//   const identity = auth.getIdentity();
//   actor = createActor(import.meta.env.CANISTER_ID_backend || "backend", {
//     agentOptions: { identity },
//   });
//   return { auth, actor };
// };

// const authForm = document.getElementById("auth-form");
// const toggleLink = document.getElementById("toggle-auth");
// const formTitle = document.getElementById("form-title");
// const submitBtn = document.getElementById("submit-btn");
// const googleBtn = document.getElementById("google-signin");

// let isRegistering = false;

// // Toggle UI login/register
// toggleLink.onclick = (e) => {
//   e.preventDefault();
//   isRegistering = !isRegistering;
//   formTitle.innerText = isRegistering ? "Register" : "Sign In";
//   submitBtn.innerText = isRegistering ? "Register" : "Sign In";
//   toggleLink.innerHTML = isRegistering
//     ? `Already have an account? <a href="#">Sign In</a>`
//     : `Don’t have an account? <a href="#">Register</a>`;
// };

// // Submit Login / Register
// authForm.onsubmit = async (e) => {
//   e.preventDefault();
//   const email = document.getElementById("email").value.trim();
//   const password = document.getElementById("password").value;

//   const { auth, actor } = await initActor();

//   await auth.login({
//     identityProvider: "https://identity.ic0.app/#authorize",
//     onSuccess: async () => {
//       const principal = auth.getIdentity().getPrincipal().toText();

//       try {
//         if (isRegistering) {
//           const result = await actor.register(email, password);
//           if (result === "Register success") {
//             alert("Registration successful. Please sign in.");
//             isRegistering = false;
//             formTitle.innerText = "Sign In";
//             submitBtn.innerText = "Sign In";
//             toggleLink.innerHTML = `Don’t have an account? <a href="#">Register</a>`;
//           } else {
//             alert(result); // misalnya: Email already registered
//           }
//         } else {
//           const success = await actor.login(email, password);
//           if (success) {
//             localStorage.setItem("loggedIn", "1");
//             localStorage.setItem("principal", principal);
//             localStorage.setItem("email", email);
//             window.location.href = "home.html";
//           } else {
//             alert("Login failed. Check your credentials.");
//           }
//         }
//       } catch (err) {
//         alert("Error: " + err);
//       }
//     }
//   });
// };

// // Login dengan Google
// googleBtn.onclick = async () => {
//   const auth = await AuthClient.create();

//   await auth.login({
//     identityProvider: "https://identity.ic0.app/#authorize",
//     onSuccess: async () => {
//       const identity = auth.getIdentity();
//       const principal = identity.getPrincipal().toText();
//       const email = `google_${principal}@example.com`;

//       const { actor } = await initActor();
//       await actor.loginWithGoogle(email);

//       localStorage.setItem("loggedIn", "1");
//       localStorage.setItem("principal", principal);
//       localStorage.setItem("email", email);
//       window.location.href = "home.html";
//     }
//   });
// };
