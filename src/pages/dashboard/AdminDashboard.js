// src/pages/AdminDashboard.js
import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import styles from "../../styles/Dashboard/AdminDashboard.module.css";
import { useNavigate } from "react-router-dom";


const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("users");
  const navigate = useNavigate();


  const resetAllFields = () => {
    setEmail(""); setPassword(""); setRole("so"); setName(""); setReportsTo(""); setStatus("");
    setPartyCode(""); setPartyName(""); setPartyLocation(""); setPartyPhone(""); setAssignedSoUid(""); setPartyStatus("");
    setProductName(""); setProductCategory("Vegetables"); setPackSize(""); setVariety(""); setPackType(""); setProductStatus("");
  };

  useEffect(() => {
    fetchUsers();
    resetAllFields();
  }, []);

  // === Add User State ===
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("so");
  const [name, setName] = useState("");
  const [reportsTo, setReportsTo] = useState(""); // assign RSM to SO
  const [status, setStatus] = useState("");
  const [salesOfficers, setSalesOfficers] = useState([]);
  const [rsmUsers, setRsmUsers] = useState([]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setStatus("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const userData = {
        uid,
        name,
        email,
        role,
        createdAt: Timestamp.now(),
      };

      if (role === "so" && reportsTo) {
        userData.reportsTo = reportsTo; // Assign RSM to SO
      }

      await setDoc(doc(db, "users", uid), userData);

      setStatus("✅ User created!");
      // Reset fields
      setEmail("");
      setPassword("");
      setName("");
      setRole("so");
      setReportsTo("");
      // Refresh user lists to reflect new users
      fetchUsers();
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setStatus("❌ This email is already registered.");
      } else {
        setStatus("❌ " + error.message);
      }
      console.error("User creation error:", error);
    }
  };

  // === Add Party State ===
  const [partyCode, setPartyCode] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyLocation, setPartyLocation] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyStatus, setPartyStatus] = useState("");
  const [assignedSoUid, setAssignedSoUid] = useState("");

  const handleAddParty = async (e) => {
    e.preventDefault();
    setPartyStatus("");

    try {
      const partyRef = doc(db, "parties", partyCode.trim());

      await setDoc(partyRef, {
        code: partyCode.trim(),
        name: partyName.trim(),
        location: partyLocation.trim(),
        phone: partyPhone.trim(),
        assignedTo: assignedSoUid,
        createdAt: Timestamp.now(),
      });

      setPartyStatus("✅ Party added!");
      // Reset fields
      setPartyCode("");
      setPartyName("");
      setPartyLocation("");
      setPartyPhone("");
      setAssignedSoUid("");
    } catch (error) {
      console.error("Party add error:", error);
      setPartyStatus("❌ " + error.message);
    }
  };

  // === Add Product State ===
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Vegetables");
  const [packSize, setPackSize] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [variety, setVariety] = useState("");
  const [packType, setPackType] = useState("");

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setProductStatus("");

    try {
      const slug = `${productName} ${variety} ${packSize} ${packType}`
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      const productRef = doc(db, "products", slug);

      await setDoc(productRef, {
        name: productName.trim(),
        category: productCategory,
        variety: variety.trim(),
        packSize: packSize.trim(),
        packType: packType.trim(),
        createdAt: Timestamp.now(),
      });

      setProductStatus("✅ Product added!");
      // Reset fields
      setProductName("");
      setProductCategory("Vegetables");
      setPackSize("");
      setVariety("");
      setPackType("");
    } catch (error) {
      console.error("Product add error:", error);
      setProductStatus("❌ " + error.message);
    }
  };

  // Fetch Sales Officers and RSM users for dropdowns
  const fetchUsers = async () => {
  try {
    const rolesToFetch = ["so", "rsm", "factoryprocgm", "khanpursale"];

    const queries = await Promise.all(
      rolesToFetch.map((role) =>
        getDocs(query(collection(db, "users"), where("role", "==", role)))
      )
    );

    const allUsers = queries.flatMap((snapshot) =>
      snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }))
    );

    setSalesOfficers(allUsers.filter((user) =>
      ["so", "factoryprocgm", "khanpursale"].includes(user.role)
    ));
    setRsmUsers(allUsers.filter((user) => user.role === "rsm"));

  } catch (error) {
    console.error("Error fetching users:", error);
  }
};


  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className={styles.adminContainer}>
      <div className={styles.logoutBtn}>
        <h2 className={styles.title}>Admin Dashboard</h2>

        <button className={styles.Btn} onClick={async () => {
          await auth.signOut();
          navigate("/");
        }}>Logout</button>
      </div>

      <div className={styles.cardContainer}>
        <div
          className={`${styles.card} ${activeSection === "users" ? styles.activeCard : ""}`}
          onClick={() => setActiveSection("users")}
        >
          Add Users
        </div>
        <div
          className={`${styles.card} ${activeSection === "parties" ? styles.activeCard : ""}`}
          onClick={() => setActiveSection("parties")}
        >
          Add Parties
        </div>
        <div
          className={`${styles.card} ${activeSection === "products" ? styles.activeCard : ""}`}
          onClick={() => setActiveSection("products")}
        >
          Add Products
        </div>
      </div>

      <div className={styles.formContainer}>
        {activeSection === "users" && (
          <>
            <h3>Add User</h3>
            <form onSubmit={handleCreateUser} className={styles.form}>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
              <select value={role} onChange={(e) => setRole(e.target.value)} className={styles.select}>
                <option value="so">Sales Officer</option>
                <option value="rsm">RSM</option>
                <option value="dealer">Dealer</option>
                <option value="logistic">Logistic Manager</option>
                <option value="owner">Company Owner</option>
                <option value="admin">Admin</option>
                <option value="factoryprocgm">Factory Procurement GM</option>
                <option value="khanpursale">Khanpur Sale Point</option>
              </select>

              {role === "so" && (
                <select
                  value={reportsTo}
                  onChange={(e) => setReportsTo(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="">Assign RSM</option>
                  {rsmUsers.length === 0 ? (
                    <option disabled>No RSMs found</option>
                  ) : (
                    rsmUsers.map((rsm) => (
                      <option key={rsm.uid} value={rsm.uid}>
                        {rsm.name}
                      </option>
                    ))
                  )}
                </select>
              )}

              <button type="submit" className={styles.button}>
                Create User
              </button>
            </form>
            {status && <p className={styles.status}>{status}</p>}
          </>
        )}

        {activeSection === "parties" && (
          <>
            <h3>Add Party</h3>
            <form onSubmit={handleAddParty} className={styles.form}>
              <input
                type="text"
                placeholder="Party Code"
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Party Name"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Location"
                value={partyLocation}
                onChange={(e) => setPartyLocation(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
                className={styles.input}
                required
              />

              <select
                value={assignedSoUid}
                onChange={(e) => setAssignedSoUid(e.target.value)}
                className={styles.select}
                required
              >
                <option value="">Assign To (SO / Factory / Khanpur)</option>
                {salesOfficers.length === 0 ? (
                  <option disabled>No Sales Officers found</option>
                ) : (
                  salesOfficers.map((so) => (
                    <option key={so.uid} value={so.uid}>
                      {so.name}
                    </option>
                  ))
                )}
              </select>

              <button type="submit" className={styles.button}>
                Add Party
              </button>
            </form>
            {partyStatus && <p className={styles.status}>{partyStatus}</p>}
          </>
        )}

        {activeSection === "products" && (
          <>
            <h3>Add Product</h3>
            <form onSubmit={handleAddProduct} className={styles.form}>
              <input
                type="text"
                placeholder="Product Name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Variety"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                className={styles.input}
              />
              <select
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className={styles.select}
                required
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Hybrid Rice">Hybrid Rice</option>
                <option value="Paddy">Paddy</option>
                <option value="Corn">Corn</option>
                <option value="Sorghum">Sorghum</option>
                <option value="Cotton">Cotton</option>
                <option value="Mustard">Mustard</option>
                <option value="Pearl Millet">Pearl Millet</option>
                <option value="Green Pea">Green Pea</option>
                <option value="Wheat">Wheat</option>
              </select>
              <input
                type="text"
                placeholder="Pack Size (e.g., 500g, 1000g)"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Pack Type (e.g., Foil, Packet, Tin)"
                value={packType}
                onChange={(e) => setPackType(e.target.value)}
                className={styles.input}
              />

              <button type="submit" className={styles.button}>
                Add Product
              </button>
            </form>
            {productStatus && <p className={styles.status}>{productStatus}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
