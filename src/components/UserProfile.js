// src/components/UserProfile.js
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import styles from "../styles/UserProfile.module.css";

const UserProfile = () => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        } else {
          console.log("No user data found in Firestore.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);



  if (!userData) {
    return <div className={styles.loading}>Loading profile...</div>;
  }

  return (
    <div className={styles.container}>
    <div className={styles.profileCard}>
      <div className={styles.avatar}>
        <span>{userData.name?.charAt(0).toUpperCase()}</span>
      </div>
      <h2 className={styles.name}>{userData.name}</h2>
      <p className={styles.email}>{userData.email}</p>
      <p className={styles.role}>{userData.role?.toUpperCase()}</p>
      <div className={styles.meta}>
        {/* Add more fields here if available */}
      </div>
    </div>
    </div>
  );
};

export default UserProfile;
