// DirectOrderDashboard.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  orderBy,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import styles from "../../styles/Dashboard/DirectOrderDashboard.module.css";
import logo from "../../assets/logo.jpg";

// 🟨 Toastify Imports
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

const ORDERS_PER_PAGE = 10;

const DirectOrderDashboard = () => {
  const [activeTab, setActiveTab] = useState("placeOrder");
  const [partyList, setPartyList] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyMobile, setPartyMobile] = useState("");
  const [partyCode, setPartyCode] = useState("");
  const [pod, setPod] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [productList, setProductList] = useState([]);
  const [orderProducts, setOrderProducts] = useState([{ productId: "", name: "", quantity: "" }]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filterParty, setFilterParty] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [approvedOrderCount, setApprovedOrderCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [rejectedOrderCount, setRejectedOrderCount] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductList(products);
      } catch (error) {
        toast.error("Error fetching product data.");
        console.error("Error fetching product data:", error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchUserName = async () => {
      const userDoc = await getDocs(
        query(collection(db, "users"), where("uid", "==", auth.currentUser.uid))
      );
      if (!userDoc.empty) {
        const data = userDoc.docs[0].data();
        setUserName(data.name || "");
        setPartyCode(data.partyCode || "");
      }
    };
    fetchUserName();
  }, []);

  const fetchOrders = async () => {
    const q = query(
      collection(db, "orders"),
      where("createdBy", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const allOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setOrders(allOrders);

    setTotalOrderCount(allOrders.length);
    setApprovedOrderCount(allOrders.filter(order => order.status === "Approved").length);
    setPendingOrderCount(allOrders.filter(order => order.status === "Placed" || order.status === "Pending").length);
    setRejectedOrderCount(allOrders.filter(order => order.status === "Rejected" || order.status === "Rejected By Logistic").length);
  };

  useEffect(() => {
    if (activeTab === "viewOrders") {
      fetchOrders();
    }
  }, [activeTab]);

  useEffect(() => {
    let filtered = orders;
    if (filterParty) {
      filtered = filtered.filter((order) =>
        order.partyName.toLowerCase().includes(filterParty.toLowerCase())
      );
    }
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      filtered = filtered.filter((order) => order.createdAt?.toDate?.() >= start);
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate + "T23:59:59");
      filtered = filtered.filter((order) => order.createdAt?.toDate?.() <= end);
    }
    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, filterParty, filterStartDate, filterEndDate]);

  useEffect(() => {
    const fetchPartyList = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "parties"), where("assignedTo", "==", auth.currentUser.uid))
        );
        const parties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPartyList(parties);
      } catch (error) {
        toast.error("Error fetching party list.");
        console.error("Error fetching parties:", error);
      }
    };
    fetchPartyList();
  }, []);

  const resetOrderForm = () => {
    setSelectedPartyId("");
    setPartyName("");
    setPartyMobile("");
    setPod("");
    setContactInfo("");
    setOrderProducts([{ productId: "", name: "", quantity: "" }]);
  };

  const handleSubmitOrder = async () => {
    if (submitting) return;

    if (!selectedPartyId || !partyName || !partyMobile || !pod || !contactInfo) {
      toast.warning("Please fill in all fields.");
      return;
    }

    if (
      orderProducts.length === 0 ||
      orderProducts.some(p => !p.productId || !p.name || !p.quantity || parseInt(p.quantity) < 1)
    ) {
      toast.warning("Please add valid product(s) with quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const refCode = `DEAL-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const order = {
        refCode,
        soId: auth.currentUser.uid,
        soName: userName,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid,
        createdByName: userName,
        partyCode,
        partyName,
        partyMobile,
        pod,
        contactInfo,
        products: orderProducts,
        status: "Placed",
      };
      await addDoc(collection(db, "orders"), order);
      toast.success("Order placed successfully!");
      resetOrderForm();
    } catch (err) {
      console.error("Error submitting order:", err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  const renderOrders = () => (
    <>
      <div className={styles.responsiveTable}>
        <table className={styles.ordersTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Party</th>
              <th>Mobile</th>
              <th>POD</th>
              <th>Contact Info</th>
              <th>Status</th>
              <th>Products</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map((order) => {
              const date = order.createdAt?.toDate?.().toLocaleString() || "N/A";
              const rowStyle =
                order.status === "Approved"
                  ? { backgroundColor: "#d4edda" }
                  : order.status === "Rejected"
                    ? { backgroundColor: "#f8d7da" }
                    : {};
              return (
                <tr key={order.id} style={rowStyle}>
                  <td>{date}</td>
                  <td>{order.partyName}</td>
                  <td>{order.partyMobile}</td>
                  <td>{order.pod}</td>
                  <td>{order.contactInfo}</td>
                  <td>{order.status}</td>
                  <td>
                    {order.products?.map((p, i) => (
                      <div key={i}>{p.name} × {p.quantity}</div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={styles.pagination}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Prev</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
      </div>
    </>
  );

  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-center" autoClose={3000} />
      <div className={styles.mobileHeader}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <h2>GM</h2>
        </div>
        <p className={styles.nameText}>{userName}</p>
        <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <FiMenu size={24} />
        </button>
      </div>

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.showSidebar : ""}`}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <h2>GM</h2>
        </div>
        <p>{userName}</p>
        <button onClick={() => { setActiveTab("placeOrder"); setSidebarOpen(false); }} className={activeTab === "placeOrder" ? styles.activeTab : ""}>Place Order</button>
        <button onClick={() => { setActiveTab("viewOrders"); setSidebarOpen(false); }} className={activeTab === "viewOrders" ? styles.activeTab : ""}>View Orders</button>
        <button onClick={async () => { await signOut(auth); navigate("/"); window.location.reload(); }} className={styles.logoutButton}>Logout</button>
      </aside>

      <main className={styles.mainContent}>
        {activeTab === "placeOrder" && (
          <div className={styles.formSection}>
            <h3>Place New Order</h3>

            <label>Select Party</label>
            <select
              value={selectedPartyId}
              onChange={(e) => {
                const selected = partyList.find(p => p.id === e.target.value);
                if (selected) {
                  setSelectedPartyId(selected.id);
                  setPartyName(selected.name);
                  setPartyMobile(selected.mobile || "");
                  setPartyCode(selected.code || "");
                }
              }}
              className={styles.inputField}
            >
              <option value="">Select Party</option>
              {partyList.map((party) => (
                <option key={party.id} value={party.id}>{party.name}</option>
              ))}
            </select>

            <label>Party Phone Number</label>
            <input type="text" value={partyMobile} onChange={(e) => setPartyMobile(e.target.value)} className={styles.inputField} placeholder="Enter Party Phone Number" />

            <label>POD</label>
            <textarea value={pod} onChange={(e) => setPod(e.target.value)} className={styles.inputField} placeholder="Enter POD" />

            <label>Contact Info</label>
            <textarea value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} className={styles.inputField} placeholder="Enter Phone Number and Delivery Address" />

            {orderProducts.map((product, index) => (
              <div key={index} className={styles.productRow}>
                <label>Product</label>
                <select
                  value={product.productId || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedProduct = productList.find(p => p.id === selectedId);
                    if (selectedProduct) {
                      const updatedProduct = {
                        productId: selectedProduct.id,
                        name: selectedProduct.name || "",
                        category: selectedProduct.category || "",
                        variety: selectedProduct.variety || "",
                        packSize: selectedProduct.packSize || "",
                        packType: selectedProduct.packType || "",
                        quantity: product.quantity || "",
                      };
                      setOrderProducts(orderProducts.map((p, i) => i === index ? updatedProduct : p));
                    }
                  }}
                  className={styles.inputField}
                >
                  <option value="">Select Product</option>
                  {productList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.variety} - {p.packSize} {p.packType}
                    </option>
                  ))}
                </select>

                <label>Quantity</label>
                <input
                  type="number"
                  placeholder="Quantity"
                  min="1"
                  value={product.quantity}
                  onChange={(e) =>
                    setOrderProducts(orderProducts.map((p, i) =>
                      i === index ? { ...p, quantity: e.target.value } : p
                    ))
                  }
                  className={styles.inputField}
                />
                <button
                  onClick={() => setOrderProducts(orderProducts.filter((_, i) => i !== index))}
                  className={styles.removeBtn}
                >
                  Remove
                </button>
              </div>
            ))}

            <button onClick={() => setOrderProducts([...orderProducts, { productId: "", name: "", quantity: "" }])} className={styles.addBtn}>+ Add Product</button>
            <button onClick={handleSubmitOrder} className={styles.submitBtn} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Order"}
            </button>
            <button onClick={resetOrderForm} className={styles.resetBtn}>Reset Order</button>
          </div>
        )}

        {activeTab === "viewOrders" && (
          <div>
            <h3>My Orders</h3>
            <div className={styles.filterContainer}>
              <input type="text" placeholder="Search by party" value={filterParty} onChange={(e) => setFilterParty(e.target.value)} />
              <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
              <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
            </div>
            <div className={styles.orderCounts}>
              <p><strong>Total Orders:</strong> {totalOrderCount}</p>
              <p><strong>Pending:</strong> {pendingOrderCount}</p>
              <p><strong>Approved:</strong> {approvedOrderCount}</p>
              <p><strong>Rejected:</strong> {rejectedOrderCount}</p>
            </div>
            {renderOrders()}
          </div>
        )}
      </main>
    </div>
  );
};

export default DirectOrderDashboard;
