// src/pages/DealerDashboard.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
    addDoc,
    collection,
    getDocs,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { FiMenu } from "react-icons/fi";
import styles from "../../styles/Dashboard/DealerDashboard.module.css";

const DirectOrderDashboard = () => {
    const [activeTab, setActiveTab] = useState("placeOrder");
    const [partyName, setPartyName] = useState("");
    const [partyMobile, setPartyMobile] = useState("");
    const [commitmentDate, setCommitmentDate] = useState("");
    const [commitmentMessage, setCommitmentMessage] = useState("");
    const [pod, setPod] = useState("");
    const [orderProducts, setOrderProducts] = useState([{ name: "", quantity: "" }]);
    const [orders, setOrders] = useState([]);
    const [filterParty, setFilterParty] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserName = async () => {
            const userDoc = await getDocs(
                query(collection(db, "users"), where("uid", "==", auth.currentUser.uid))
            );
            if (!userDoc.empty) {
                setUserName(userDoc.docs[0].data().name || "");
            }
        };

        fetchUserName();
    }, []);

    const handleAddProduct = () => {
        setOrderProducts([...orderProducts, { name: "", quantity: "" }]);
    };


    const resetOrderForm = () => {
        setPartyName("");
        setPartyMobile("");
        setOrderProducts([{ name: "", quantity: "" }]);
    }

    const handleRemoveProduct = (index) => {
        const updated = [...orderProducts];
        updated.splice(index, 1);
        setOrderProducts(updated);
    };

    const handleProductChange = (index, field, value) => {
        const updated = [...orderProducts];
        updated[index][field] = value;
        setOrderProducts(updated);
    };

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
            partyName,
            partyMobile,
            commitmentDate,
            commitmentMessage,
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

    const fetchOrders = async () => {
        const q = query(collection(db, "orders"), where("createdBy", "==", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const sorted = data.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
        setOrders(sorted);
    };

    useEffect(() => {
        if (activeTab === "viewOrders") {
            fetchOrders();
        }
    }, [activeTab]);

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/");
        window.location.reload();
    };

    const renderOrders = () => {
        const filtered = orders.filter((order) => {
            const matchParty = filterParty ? order.partyName.toLowerCase().includes(filterParty.toLowerCase()) : true;
            const orderDate = order.createdAt?.toDate?.();
            const matchStart = filterStartDate ? orderDate >= new Date(filterStartDate) : true;
            const matchEnd = filterEndDate ? orderDate <= new Date(filterEndDate + "T23:59:59") : true;
            return matchParty && matchStart && matchEnd;
        });

        return (
            <div className={styles.responsiveTable}>
                <table className={styles.ordersTable}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Party</th>
                            <th>Mobile</th>
                            <th>Commitment</th>
                            <th>POD</th>
                            <th>Status</th>
                            <th>Products</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((order) => {
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
                                    <td>
                                        {order.commitmentDate || "N/A"}<br />
                                        <i>{order.commitmentMessage || "N/A"}</i>
                                    </td>
                                    <td>{order.pod}</td>
                                    <td>{order.status}</td>
                                    <td>
                                        {order.products?.map((p, i) => (
                                            <div key={i}>
                                                {p.name} × {p.quantity}
                                            </div>
                                        ))}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.mobileHeader}>
                <h2>GM Dashboard</h2>
                <p className={styles.nameText}>{userName}</p>
                <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <FiMenu size={24} />
                </button>
            </div>

            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.showSidebar : ""}`}>
                <h2>GM Dashboard</h2>
                <p>{userName}</p>
                <button onClick={() => {setActiveTab("placeOrder"); setSidebarOpen(false)}} className={activeTab === "placeOrder" ? styles.activeTab : ""}>
                    Place Order
                </button>
                <button onClick={() => {setActiveTab("viewOrders"); setSidebarOpen(false)}} className={activeTab === "viewOrders" ? styles.activeTab : ""}>
                    View Orders
                </button>
                <button onClick={handleLogout} className={styles.logoutButton}>
                    Logout
                </button>
            </aside>

            <main className={styles.mainContent}>
                {activeTab === "placeOrder" && (
                    <div className={styles.formSection}>
                        <h3>Place New Order</h3>
                        <label>Party Name</label>
                        <input
                            type="text"
                            placeholder="Enter Your Party Name"
                            value={partyName}
                            onChange={(e) => setPartyName(e.target.value)}
                            className={styles.inputField}
                        />
                        <label>Party Phone Number</label>
                        <input
                            type="text"
                            placeholder="Enter Party Mobile Number"
                            value={partyMobile}
                            onChange={(e) => setPartyMobile(e.target.value)}
                            className={styles.inputField}
                        />
                        <label>Commitment Date</label>
                        <input
                            type="date"
                            value={commitmentDate}
                            onChange={(e) => setCommitmentDate(e.target.value)}
                            className={styles.inputField}
                        />

                        <label>Commitment Message</label>
                        <textarea
                            value={commitmentMessage}
                            onChange={(e) => setCommitmentMessage(e.target.value)}
                            placeholder="Enter commitment details"
                            className={styles.inputField}
                        />
                        <label>POD</label>
                        <textarea
                            value={pod}
                            onChange={(e) => setPod(e.target.value)}
                            placeholder="Enter POD message"
                            className={styles.inputField}
                        />
                        {orderProducts.map((product, index) => (
                            <div key={index} className={styles.productRow}>
                                <label>Product Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Product Name"
                                    value={product.name}
                                    onChange={(e) => handleProductChange(index, "name", e.target.value)}
                                    className={styles.inputField}
                                />
                                <label>Product Quantity</label>
                                <input
                                    type="number"
                                    placeholder="Enter Product Quantity"
                                    value={product.quantity}
                                    onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
                                    className={styles.inputField}
                                />
                                <button onClick={() => handleRemoveProduct(index)} className={styles.removeBtn}>Remove</button>
                            </div>
                        ))}
                        <button onClick={handleAddProduct} className={styles.addBtn}>+ Add Product</button>
                        <button onClick={handleSubmitOrder} className={styles.submitBtn}>Submit Order</button>
                        <button onClick={resetOrderForm} className={styles.resetBtn}>Reset Order</button>
                    </div>
                )}

                {activeTab === "viewOrders" && (
                    <div>
                        <h3>My Orders</h3>
                        <div className={styles.filterContainer}>
                            <input
                                type="text"
                                placeholder="Search by party"
                                value={filterParty}
                                onChange={(e) => setFilterParty(e.target.value)}
                            />
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

export default DirectOrderDashboard;
