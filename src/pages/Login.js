// src/pages/Login.js
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Login.module.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const role = userDoc.data().role?.toLowerCase();

        switch (role) {
          case "admin":
            navigate("/dashboard/admin");
            break;
          case "rsm":
            navigate("/dashboard/rsm");
            break;
          case "so":
            navigate("/dashboard/so");
            break;
          case "dealer":
            navigate("/dashboard/dealer");
            break;
          case "logistic":
            navigate("/dashboard/logistic");
            break;
          case "owner":
            navigate("/dashboard/owner");
            break;
          case "factoryprocgm":
            navigate("/dashboard/direct");
            break;
          case "directsales":
            navigate("/dashboard/directsales");
            break;
          default:
            navigate("/dashboard");
        }
      } else {
        setError("User data not found in Firestore.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className={styles.loginPage}>
      <div className={styles.loginBox}>
        <h2>Welcome to Tezro</h2>
        <p className={styles.subtext}>Sign in to Manage Orders</p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
