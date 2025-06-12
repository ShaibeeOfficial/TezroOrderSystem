// components/ProtectedRoute.js
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

const ProtectedRoute = ({ allowedRole, children }) => {
  const [user, loadingAuth] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role?.toLowerCase());
        }
      }
      setLoadingRole(false);
    };
    fetchRole();
  }, [user]);

  if (loadingAuth || loadingRole) return <p>Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


export default ProtectedRoute;
