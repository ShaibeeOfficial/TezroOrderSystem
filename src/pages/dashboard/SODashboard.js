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
import { FiMenu } from "react-icons/fi";
import logo from "../../assets/logo.jpg"; // adjust path as needed
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const SODashboard = () => {
  const [activeTab, setActiveTab] = useState("placeOrder");
  const [parties, setParties] = useState([]);
  const [partyMobile, setPartyMobile] = useState("");
  const [pod, setPod] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [rsmId, setRsmId] = useState("");
  const [rsmName, setRsmName] = useState("");
  const [soName, setSoName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [filterParty, setFilterParty] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false); // 🔒 Double submit protection
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");



  // 🚀 Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const navigate = useNavigate();


  const handleShowRejectionMessage = (message) => {
    setRejectionMessage(message || "No rejection message provided.");
    setShowRejectionModal(true);
  };


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
        const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sorted = ordersData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
        setOrders(sorted);
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

  const resetOrderForm = () => {
    setSelectedParty("");
    setSelectedProducts([]);
    setPartyMobile("");
    setPod("");
    setContactInfo("");
  };

  const handleSubmitOrder = async () => {
    if (submitting) return;

    // Validate form
    if (!selectedParty) {
      toast.error("Please select a party.");
      return;
    }

    if (!partyMobile.trim()) {
      toast.error("Please enter the party phone number.");
      return;
    }

    if (!pod.trim()) {
      toast.error("Please enter the POD.");
      return;
    }

    if (!contactInfo.trim()) {
      toast.error("Please enter contact info.");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product.");
      return;
    }

    const incompleteProduct = selectedProducts.find(
      (p) => !p.productId || !p.quantity || parseInt(p.quantity) <= 0
    );

    if (incompleteProduct) {
      toast.error("Please Enter Valid Quantity");
      return;
    }

    const selectedPartyObj = parties.find(p => p.name === selectedParty);
    const partyCode = selectedPartyObj?.code || "N/A";
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
      createdByName: soName,
      partyCode,
      partyName: selectedParty,
      partyMobile,
      pod,
      contactInfo,
      products: enrichedProducts,
      status: "Pending",
      createdAt: serverTimestamp(),
    };

    try {
      setSubmitting(true);
      await addDoc(collection(db, "orders"), order);
      toast.success("Order placed successfully!");
      resetOrderForm();
    } catch (err) {
      console.error("Failed to place order:", err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
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

    const totalPages = Math.ceil(filteredOrders.length / pageSize);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    if (!filteredOrders.length) return <p>No matching orders found.</p>;

    return (
      <>
        <div className={styles.responsiveTable}>
          <table className={styles.ordersTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Party</th>
                <th>Party Number</th>
                <th>POD</th>
                <th>Contact Info</th>
                <th>Status</th>
                <th>Product</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map(order => {
                const filteredProducts = order.products.filter(p => p.addedBy !== "LM");
                const rowStyle =
                  order.status === "Approved"
                    ? { backgroundColor: "#d4edda" }
                    : order.status === "Rejected" || order.status === "Rejected By BM/RSM" || order.status === "Rejected By Logistic"
                      ? { backgroundColor: "#f8d7da" }
                      : {};

                return filteredProducts.length === 0 ? (
                  <tr key={order.id} style={rowStyle}>
                    <td>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : "N/A"}</td>
                    <td>{order.partyName}</td>
                    <td>{order.status}</td>
                    <td>{order.pod || 'N/A'}</td>
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
                          <td rowSpan={filteredProducts.length}>{order.partyMobile}</td>
                          <td rowSpan={filteredProducts.length}>{order.pod || "N/A"}</td>
                          <td rowSpan={filteredProducts.length}>{order.contactInfo || "N/A"}</td>
                          <td rowSpan={filteredProducts.length}>
                            {order.status}
                            {["Rejected", "Rejected By Logistic", "Rejected By BM/RSM"].includes(order.status) && order.rejectionMessage && (
                              <span
                                onClick={() => handleShowRejectionMessage(order.rejectionMessage)}
                                title="View Rejection Reason"
                                style={{
                                  marginLeft: "8px",
                                  cursor: "pointer",
                                  color: "#dc3545",
                                  fontWeight: "bold",
                                }}
                              >
                               ❗
                              </span>
                            )}
                          </td>
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
        </div>

        <div className={styles.pagination}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
            Previous
          </button>
          <span style={{ margin: "0 10px" }}>
            Page {currentPage} of {totalPages}
          </span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
            Next
          </button>
        </div>
      </>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-center" />
      <div className={styles.mobileHeader}>
        <div className={styles.logoContainer}>
          <img src={logo || "/logo.png"} alt="Logo" className={styles.logo} />
          <h2>Dashboard</h2>
        </div>
        <p>{soName}</p>
        <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <FiMenu size={24} />
        </button>
      </div>

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.showSidebar : ""}`}>
        <div className="nameView">
          <div className={styles.logoContainer}>
            <img src={logo || "/logo.png"} alt="Logo" className={styles.logo} />
            <h2>Dashboard</h2>
          </div>
          <p>{soName}</p>
        </div>
        <button onClick={() => setActiveTab("placeOrder")} className={activeTab === "placeOrder" ? styles.activeTab : ""}>Place Order</button>
        <button onClick={() => setActiveTab("orders")} className={activeTab === "orders" ? styles.activeTab : ""}>View Orders</button>
        <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
      </aside>

      <main className={styles.mainContent}>
        {activeTab === "placeOrder" && (
          <div className={styles.formSection}>
            <h3>Place New Order</h3>
            <label>Party</label>
            <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className={styles.partySection}>
              <option value="">Select a party</option>
              {parties.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
            <label>Party Phone Number</label>
            <input type="text" value={partyMobile} onChange={(e) => setPartyMobile(e.target.value)} className={styles.inputField} placeholder="Enter Party Phone Number" />
            <label>POD</label>
            <textarea value={pod} onChange={(e) => setPod(e.target.value)} placeholder="Enter Your POD" className={styles.partySection} />
            <label>Contact Info</label>
            <textarea value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Enter Phone Number and Delivery Address" className={styles.partySection} />
            {selectedProducts.map((product, index) => (
              <div key={index} className={styles.productRow}>
                <select value={product.productId} onChange={(e) => handleProductChange(index, "productId", e.target.value)} className={styles.productSelect}>
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - {p.variety} - {p.packSize} - {p.packType}</option>
                  ))}
                </select>
                <input type="number" placeholder="Qty" min="1" value={product.quantity} onChange={(e) => handleProductChange(index, "quantity", e.target.value)} className={styles.qtyInput} />
                <button onClick={() => {
                  const updated = selectedProducts.filter((_, i) => i !== index);
                  setSelectedProducts(updated);
                }} className={styles.removeBtn}>Remove</button>
              </div>
            ))}
            <button onClick={handleAddProduct} className={styles.productBtn}>+ Add Product</button>
            <div className={styles.actionButtons}>
              <button onClick={handleSubmitOrder} className={styles.submitBtn} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Order"}
              </button>
              <button onClick={resetOrderForm} className={styles.cancelBtn}>Reset</button>
            </div>
          </div>
        )}
        {activeTab === "orders" && (
          <div>
            <h2>My Orders</h2>
            <div className={styles.orderCounts}>
              <span className={styles.totalBox}>Total Orders: {orders.length}</span>
              <span className={styles.pendingBox}>
                Pending: {orders.filter(order => order.status === "Pending").length}
              </span>
              <span className={styles.approvedBox}>
                Approved: {orders.filter(order => order.status === "Approved").length}
              </span>
              <span className={styles.rejectedBox}>
                Rejected: {
                  orders.filter(order =>
                    order.status === "Rejected" ||
                    order.status === "Rejected By BM/RSM" ||
                    order.status === "Rejected By Logistic"
                  ).length
                }
              </span>
            </div>

            <div className={styles.filterContainer}>
              <label>Party: </label>
              <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)}>
                <option value="">All</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <label>Start Date: </label>
              <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
              <label>End Date: </label>
              <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>
            {showRejectionModal && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3>Rejection Message</h3>
                  <p>{rejectionMessage}</p>
                  <button onClick={() => setShowRejectionModal(false)} className={styles.modalCloseBtn}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {renderOrdersList()}
          </div>
        )}


      </main>
    </div>
  );
};

export default SODashboard;
