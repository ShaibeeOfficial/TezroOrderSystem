// DealerDashboard.js
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
import styles from "../../styles/Dashboard/DealerDashboard.module.css";
import logo from "../../assets/logo.jpg";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ORDERS_PER_PAGE = 10;

const DealerDashboard = () => {
  const [activeTab, setActiveTab] = useState("placeOrder");
  const [partyName, setPartyName] = useState("");
  const [partyMobile, setPartyMobile] = useState("");
  const [partyCode, setPartyCode] = useState("");
  const [pod, setPod] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [productList, setProductList] = useState([]);
  const [orderProducts, setOrderProducts] = useState([{ name: "", quantity: "" }]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filterParty, setFilterParty] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false); // prevent double submit
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [approvedOrderCount, setApprovedOrderCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [rejectedOrderCount, setRejectedOrderCount] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);



  const navigate = useNavigate();

  const openRejectionModal = (reason) => {
    setRejectionReason(reason);
    setShowRejectionModal(true);
  };

  const closeRejectionModal = () => {
    setShowRejectionModal(false);
    setRejectionReason("");
  };

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

    const fetchProductSuggestions = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        setProductList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching product suggestions:", error);
      }
    };

    fetchUserName();
    fetchProductSuggestions();
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
    setRejectedOrderCount(allOrders.filter(order => order.status === "Rejected" || order.status === "Rejected By BM/RSM" || order.status === "Rejected By Logistic").length);

  };

  useEffect(() => {
    if (activeTab === "viewOrders") fetchOrders();
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

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  const handleSubmitOrder = async () => {
    if (submitting) return;
    if (!partyName.trim() || !partyMobile.trim() || !contactInfo.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (orderProducts.length === 0 || orderProducts.some(p => !p.name || !p.quantity)) {
      toast.error("Please add at least one valid product with valid Quantity.");
      return;
    }

    try {
      setSubmitting(true);
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
    } catch (error) {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetOrderForm = () => {
    setPartyName("");
    setPartyMobile("");
    setPod("");
    setContactInfo("");
    setOrderProducts([{ name: "", quantity: "" }]);
  };

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
                  : ["Rejected", "Rejected By BM/RSM", "Rejected By Logistic"].includes(order.status)
                    ? { backgroundColor: "#f8d7da" }
                    : {};

              return (
                <tr key={order.id} style={rowStyle}>
                  <td>{date}</td>
                  <td>{order.partyName}</td>
                  <td>{order.partyMobile}</td>
                  <td>{order.pod}</td>
                  <td>{order.contactInfo}</td>
                  <td>
                    {order.status}
                    {["Rejected", "Rejected By Logistic"].includes(order.status) &&
                      order.rejectionReason?.trim() !== "" && (
                        <button
                          onClick={() => openRejectionModal(order.rejectionMessage)}
                          style={{ marginLeft: 5, background: "none", border: "none", cursor: "pointer", color: "#dc3545" }}
                          title="View Rejection Reason"
                        >
                          ❗
                        </button>
                      )}


                  </td>
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

  const isVegetableOrPearlMillat = (product) => {
    if (!product) return false;
    const name = product.name?.toLowerCase() || "";
    const category = product.category?.toLowerCase() || "";
    return category === "vegetables" || category === "pearl millet" || name.includes("pearl millet") || category === "hyrbid mustard" || category === "mustard" || name.includes("mustard");
  };

  const hasVegetableOrPearlMillatSelected = orderProducts.some((p) => {
    const prod = productList.find((prod) => prod.id === p.productId);
    return isVegetableOrPearlMillat(prod);
  });

  const hasOtherProductSelected = orderProducts.some((p) => {
    const prod = productList.find((prod) => prod.id === p.productId);
    return prod && !isVegetableOrPearlMillat(prod);
  });


  return (
    <div className={styles.dashboardContainer}>
      <ToastContainer position="top-center" />
      <div className={styles.mobileHeader}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <h2>Dealer</h2>
        </div>
        <p className={styles.nameText}>{userName}</p>
        <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <FiMenu size={24} />
        </button>
      </div>

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.showSidebar : ""}`}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <h2>Dealer</h2>
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
            <label>Party Name</label>
            <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Enter Party Name" className={styles.inputField} />
            <label>Party Phone Number</label>
            <input type="text" value={partyMobile} onChange={(e) => setPartyMobile(e.target.value)} placeholder="Enter Party Phone Number" className={styles.inputField} />
            <label>POD</label>
            <textarea value={pod} onChange={(e) => setPod(e.target.value)} placeholder="Enter Your POD" className={styles.inputField} />
            <label>Contact Info</label>
            <textarea value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Enter the Delivery Address and Phone Number of Person who Receive Order" className={styles.inputField} />

            {orderProducts.map((product, index) => (
              <div key={index} className={styles.productRow}>
                <label>Product</label>
                <select
                  value={product.productId || ""}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedProduct = productList.find(p => p.id === selectedId);
                    if (!selectedProduct) return;

                    const isVegOrPearl = isVegetableOrPearlMillat(selectedProduct);

                    if (isVegOrPearl && hasOtherProductSelected) {
                      toast.warning("You cannot select Vegetables or Pearl Millet with other products.");
                      return;
                    }

                    if (!isVegOrPearl && hasVegetableOrPearlMillatSelected) {
                      toast.warning("You cannot select other products with Vegetables or Pearl Millet.");
                      return;
                    }

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
                  }}
                  className={styles.inputField}
                >
                  <option value="">Select Product</option>
                  {Array.from(new Set(productList.map(p => p.category))).map(category => (
                    <optgroup key={category} label={category}>
                      {productList
                        .filter(p => p.category === category)
                        .map(p => {
                          const disable =
                            (hasVegetableOrPearlMillatSelected && !isVegetableOrPearlMillat(p)) ||
                            (hasOtherProductSelected && isVegetableOrPearlMillat(p));

                          return (
                            <option key={p.id} value={p.id} disabled={disable}>
                              {p.name} - {p.variety} - {p.packSize} {p.packType}
                            </option>
                          );
                        })}
                    </optgroup>
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
                <button onClick={() => setOrderProducts(orderProducts.filter((_, i) => i !== index))} className={styles.removeBtn}>
                  Remove
                </button>
              </div>
            ))}
            <button onClick={() => setOrderProducts([...orderProducts, { name: "", quantity: "" }])} className={styles.addBtn}>+ Add Product</button>
            <button onClick={handleSubmitOrder} className={styles.submitBtn} disabled={submitting}>
              {submitting ? "Placing..." : "Submit Order"}
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
            {showRejectionModal && (
              <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                  <h3>Rejection Reason</h3>
                  <p>{rejectionReason}</p>
                  <button onClick={closeRejectionModal} className={styles.closeBtn}>Close</button>
                </div>
              </div>
            )}

            {renderOrders()}
          </div>
        )}
      </main>
    </div>
  );
};

export default DealerDashboard;
