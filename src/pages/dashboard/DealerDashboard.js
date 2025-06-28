// Updated DealerDashboard.js with client-side pagination
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

const ORDERS_PER_PAGE = 10;

const DealerDashboard = () => {
    const [activeTab, setActiveTab] = useState("placeOrder");
    const [partyName, setPartyName] = useState("");
    const [partyMobile, setPartyMobile] = useState("");
    const [partyCode, setPartyCode] = useState("");
    const [pod, setPod] = useState("");
    const [orderProducts, setOrderProducts] = useState([{ name: "", quantity: "" }]);
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [filterParty, setFilterParty] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const navigate = useNavigate();

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

    const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ORDERS_PER_PAGE,
        currentPage * ORDERS_PER_PAGE
    );

    const handleSubmitOrder = async () => {
        if (!partyName || !partyMobile || orderProducts.length === 0) {
            alert("Please fill in all fields and add at least one product.");
            return;
        }
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
            products: orderProducts,
            status: "Placed",
        };
        await addDoc(collection(db, "orders"), order);
        alert("Order placed!");
        setPartyName("");
        setPartyMobile("");
        setPod("");
        setOrderProducts([{ name: "", quantity: "" }]);
    };

    const resetOrderForm = () => {
        setPartyName("");
        setPartyMobile("");
        setOrderProducts([{ name: "", quantity: "" }]);
    }


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
            {/* Mobile Header */}
            <div className={styles.mobileHeader}>
                <h2>Dealer Dashboard</h2>
                <p className={styles.nameText}>{userName}</p>
                <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <FiMenu size={24} />
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.showSidebar : ""}`}>
                <h2>Dealer</h2>
                <p>{userName}</p>
                <button onClick={() => { setActiveTab("placeOrder"); setSidebarOpen(false) }} className={activeTab === "placeOrder" ? styles.activeTab : ""}>Place Order</button>
                <button onClick={() => { setActiveTab("viewOrders"); setSidebarOpen(false) }} className={activeTab === "viewOrders" ? styles.activeTab : ""}>View Orders</button>
                <button onClick={async () => { await signOut(auth); navigate("/"); window.location.reload(); }} className={styles.logoutButton}>Logout</button>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {activeTab === "placeOrder" && (
                    <div className={styles.formSection}>
                        <h3>Place New Order</h3>
                        <label>Party Name</label>
                        <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)} className={styles.inputField}  placeholder="Enter Party Name" />
                        <label>Party Phone Number</label>
                        <input type="text" value={partyMobile} onChange={(e) => setPartyMobile(e.target.value)} className={styles.inputField} placeholder="Enter Party Phone Number" />
                        <label>POD</label>
                        <textarea value={pod} onChange={(e) => setPod(e.target.value)} className={styles.inputField} placeholder="Enter POD"/>
                        {orderProducts.map((product, index) => (
                            <div key={index} className={styles.productRow}>
                                <label>Product Name</label>
                                <input type="text" placeholder="Product Name" value={product.name} onChange={(e) => setOrderProducts(orderProducts.map((p, i) => i === index ? { ...p, name: e.target.value } : p))} className={styles.inputField} />
                                <label>Product Quantity</label>
                                <input type="number" placeholder="Quantity" value={product.quantity} onChange={(e) => setOrderProducts(orderProducts.map((p, i) => i === index ? { ...p, quantity: e.target.value } : p))} className={styles.inputField} />
                                <button onClick={() => setOrderProducts(orderProducts.filter((_, i) => i !== index))} className={styles.removeBtn}>Remove</button>
                            </div>
                        ))}
                        <button onClick={() => setOrderProducts([...orderProducts, { name: "", quantity: "" }])} className={styles.addBtn}>+ Add Product</button>
                        <button onClick={handleSubmitOrder} className={styles.submitBtn}>Submit Order</button>
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
                        {renderOrders()}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DealerDashboard;
