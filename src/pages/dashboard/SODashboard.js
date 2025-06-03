// src/pages/SODashboard.js
import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import styles from "../../styles/Dashboard/SODashboard.module.css";
import UserProfile from "../../components/UserProfile";

const SODashboard = () => {
  const [activeTab, setActiveTab] = useState("placeOrder");
  const [showModal, setShowModal] = useState(false);
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [rsmId, setRsmId] = useState("");
  const [rsmName, setRsmName] = useState("");
  const [soName, setSoName] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Filter states
  const [filterParty, setFilterParty] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      const partyRef = collection(db, "parties");
      const q = query(partyRef, where("assignedTo", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setParties(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const productsRef = collection(db, "products");
      const productsSnapshot = await getDocs(productsRef);
      setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setRsmId(userData.reportsTo || "");
        setSoName(userData.name || "");
        if (userData.reportsTo) {
          const rsmDoc = await getDoc(doc(db, "users", userData.reportsTo));
          if (rsmDoc.exists()) {
            setRsmName(rsmDoc.data().name || "");
          }
        }
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!auth.currentUser) return;
      setLoadingOrders(true);
      try {
        const ordersQuery = query(collection(db, "orders"), where("soId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(ordersQuery);
        setOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching orders:", err);
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    if (activeTab === "orders") {
      fetchOrders();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
    window.location.reload();
  };

  const handleAddProduct = () => {
    setSelectedProducts([...selectedProducts, { productId: "", quantity: "" }]);
  };

  const handleProductChange = (index, field, value) => {
    const updated = [...selectedProducts];
    updated[index][field] = value;
    setSelectedProducts(updated);
  };

  const resetOrderModal = () => {
    setShowModal(false);
    setSelectedParty("");
    setSelectedProducts([]);
  };

  const handleSubmitOrder = async () => {
    if (!selectedParty || selectedProducts.length === 0) {
      alert("Please select a party and at least one product.");
      return;
    }

    const refCode = `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const enrichedProducts = selectedProducts.map(p => {
      const product = products.find(prod => prod.id === p.productId);
      return product
        ? {
            productId: p.productId,
            name: product.name || "",
            category: product.category || "N/A",
            variety: product.variety || "N/A",
            packSize: product.packSize || "N/A",
            packType: product.packType || "N/A",
            quantity: p.quantity,
          }
        : {
            productId: p.productId,
            name: "Unknown",
            category: "N/A",
            variety: "N/A",
            packSize: "N/A",
            packType: "N/A",
            quantity: p.quantity,
          };
    });

    const order = {
      refCode,
      soId: auth.currentUser.uid,
      soName,
      rsmId,
      rsmName,
      createdBy: auth.currentUser.uid,
      partyName: selectedParty,
      products: enrichedProducts,
      status: "Pending",
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "orders"), order);
      alert("Order placed successfully!");
      resetOrderModal();
    } catch (err) {
      console.error("Failed to place order:", err);
    }
  };

  const renderOrdersList = () => {
    if (loadingOrders) return <p>Loading orders...</p>;

    const filteredOrders = orders.filter(order => {
      const matchesParty = filterParty ? order.partyName === filterParty : true;

      const orderDate = order.createdAt?.toDate?.();
      const matchesStartDate = filterStartDate ? orderDate >= new Date(filterStartDate) : true;
      const matchesEndDate = filterEndDate ? orderDate <= new Date(filterEndDate + "T23:59:59") : true;

      return matchesParty && matchesStartDate && matchesEndDate;
    });

    if (!filteredOrders.length) return <p>No matching orders found.</p>;

    return (
      <table className={styles.ordersTable}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Party</th>
            <th>Status</th>
            <th>Product</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => {
            const filteredProducts = order.products.filter(p => p.addedBy !== "LM");
            const rowStyle =
              order.status === "Approved"
                ? { backgroundColor: "#d4edda" }
                : order.status === "Rejected"
                ? { backgroundColor: "#f8d7da" }
                : {};

            return filteredProducts.length === 0 ? (
              <tr key={order.id} style={rowStyle}>
                <td>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : "N/A"}</td>
                <td>{order.partyName}</td>
                <td>{order.status}</td>
                <td>N/A</td>
              </tr>
            ) : (
              filteredProducts.map((product, idx) => (
                <tr key={`${order.id}-${idx}`} style={rowStyle}>
                  {idx === 0 && (
                    <>
                      <td rowSpan={filteredProducts.length}>
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : "N/A"}
                      </td>
                      <td rowSpan={filteredProducts.length}>{order.partyName}</td>
                      <td rowSpan={filteredProducts.length}>{order.status}</td>
                    </>
                  )}
                  <td>
                    {product.name} - {product.variety} - {product.packSize} {product.packType} × {product.quantity}
                  </td>
                </tr>
              ))
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <h2>T.M Dashboard</h2>
        <button
          onClick={() => setActiveTab("profile")}
          className={activeTab === "profile" ? styles.activeTab : ""}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("placeOrder")}
          className={activeTab === "placeOrder" ? styles.activeTab : ""}
        >
          Place Order
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={activeTab === "orders" ? styles.activeTab : ""}
        >
          View Orders
        </button>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </aside>

      <main className={styles.mainContent}>
        {activeTab === "profile" && <UserProfile />}
        {activeTab === "placeOrder" && (
          <div>
            <h3>Place New Order</h3>
            <button onClick={() => setShowModal(true)} className={styles.cancelBtn}>
              + Create Order
            </button>
          </div>
        )}
        {activeTab === "orders" && (
          <div>
            <h2>My Orders</h2>

            {/* Filter controls */}
            <div
              className={styles.filterContainer}
              style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
            >
              <label>Party: </label>
              <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)}>
                <option value="">All</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label style={{ marginLeft: "1rem" }}>Start Date: </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />

              <label style={{ marginLeft: "1rem" }}>End Date: </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>

            {renderOrdersList()}
          </div>
        )}

        {showModal && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
              <h3>New Order</h3>
              <label>Party</label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className={styles.partySection}
              >
                <option value="">Select a party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>

              {selectedProducts.map((product, index) => (
                <div
                  key={index}
                  style={{ display: "flex", gap: "10px", marginBottom: "8px" }}
                >
                  <select
                    value={product.productId}
                    onChange={(e) => handleProductChange(index, "productId", e.target.value)}
                  >
                    <option value="">Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {p.variety} - {p.packSize} - {p.packType}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Quantity"
                    min="1"
                    value={product.quantity}
                    onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
                  />
                  <button
                    onClick={() => {
                      const updated = selectedProducts.filter((_, i) => i !== index);
                      setSelectedProducts(updated);
                    }}
                    style={{
                      background: "#e74c3c",
                      color: "#fff",
                      border: "none",
                      padding: "5px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button onClick={handleAddProduct} className={styles.productBtn}>
                + Add Product
              </button>
              <div style={{ marginTop: "10px" }}>
                <button onClick={handleSubmitOrder} className={styles.submitBtn}>
                  Submit Order
                </button>
                <button onClick={resetOrderModal} className={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SODashboard;
