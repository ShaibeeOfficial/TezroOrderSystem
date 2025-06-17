// src/pages/DirectOrderDashboard.js
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
import styles from "../../styles/Dashboard/DirectOrderDashboard.module.css";
import { FiMenu } from "react-icons/fi";

const DirectOrderDashboard = () => {
    const [activeTab, setActiveTab] = useState("placeOrder");
    const [parties, setParties] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedParty, setSelectedParty] = useState("");
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [pod, setPod] = useState("");
    const [commitmentDate, setCommitmentDate] = useState("");
    const [commitmentMessage, setCommitmentMessage] = useState("");
    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [filterParty, setFilterParty] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [userName, setUserName] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
                setUserName(userDoc.data().name || "");
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

                // Sort newest first
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
        setPod("");
    };

    const handleSubmitOrder = async () => {
        if (!selectedParty || selectedProducts.length === 0) {
            alert("Please select a party and at least one product.");
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
            soName: userName,
            createdBy: auth.currentUser.uid,
            partyName: selectedParty,
            partyCode,
            pod,
            commitmentDate,
            commitmentMessage,
            products: enrichedProducts,
            status: "Placed",
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, "orders"), order);
            alert("Order placed successfully!");
            resetOrderForm();
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
            <div className={styles.responsiveTable}>
                <table className={styles.ordersTable}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Party</th>
                            <th>Commitment</th>
                            <th>POD</th>
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

                            return filteredProducts.map((product, idx) => (
                                <tr key={`${order.id}-${idx}`} style={rowStyle}>
                                    {idx === 0 && (
                                        <>
                                            <td rowSpan={filteredProducts.length}>{order.createdAt?.toDate()?.toLocaleString() || "N/A"}</td>
                                            <td rowSpan={filteredProducts.length}>{order.partyName}</td>
                                            <td rowSpan={filteredProducts.length}>
                                                {order.commitmentDate || "N/A"}<br />
                                                <i>{order.commitmentMessage || "N/A"}</i>
                                            </td>
                                            <td rowSpan={filteredProducts.length}>{order.pod || "N/A"}</td>
                                            <td rowSpan={filteredProducts.length}>{order.status}</td>
                                        </>
                                    )}
                                    <td>
                                        {product.name} - {product.variety} - {product.packSize} {product.packType} × {product.quantity}
                                    </td>
                                </tr>
                            ));
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={styles.dashboardContainer}>
            <div className={styles.mobileHeader}>
                <h2>Factory Order Dashboard</h2>
                <p>{userName}</p>
                <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
                    <FiMenu size={24} />
                </button>
            </div>

            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.showSidebar : ""}`}>
                <div className={styles.nameView}>
                    <h2>Factory Dashboard</h2>
                    <p className={styles.userDetailsDesktop}>{userName}</p>
                </div>
                <button onClick={() => {setActiveTab("placeOrder"); setSidebarOpen(false)}} className={activeTab === "placeOrder" ? styles.activeTab : ""}>
                    Place Order
                </button>
                <button onClick={() => {setActiveTab("orders"); setSidebarOpen(false)}} className={activeTab === "orders" ? styles.activeTab : ""}>
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
                        <label>Party</label>
                        <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className={styles.partySection}>
                            <option value="">Select a party</option>
                            {parties.map((p) => (
                                <option key={p.id} value={p.name}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                        <label>POD</label>
                        <textarea
                            value={pod}
                            onChange={(e) => setPod(e.target.value)}
                            placeholder="Enter POD message"
                            className={styles.partySection}
                        />
                        <label>Commitment Date</label>
                        <input
                            type="date"
                            value={commitmentDate}
                            onChange={(e) => setCommitmentDate(e.target.value)}
                            className={styles.partySection}
                        />

                        <label>Commitment Message</label>
                        <textarea
                            value={commitmentMessage}
                            onChange={(e) => setCommitmentMessage(e.target.value)}
                            placeholder="Enter commitment details"
                            className={styles.partySection}
                        />
                        {selectedProducts.map((product, index) => (
                            <div key={index} className={styles.productRow}>
                                <select
                                    value={product.productId}
                                    onChange={(e) => handleProductChange(index, "productId", e.target.value)}
                                    className={styles.productSelect}
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
                                    placeholder="Qty"
                                    min="1"
                                    value={product.quantity}
                                    onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
                                    className={styles.qtyInput}
                                />
                                <button onClick={() => {
                                    const updated = selectedProducts.filter((_, i) => i !== index);
                                    setSelectedProducts(updated);
                                }} className={styles.removeBtn}>Remove</button>
                            </div>
                        ))}
                        <button onClick={handleAddProduct} className={styles.productBtn}>+ Add Product</button>
                        <div className={styles.actionButtons}>
                            <button onClick={handleSubmitOrder} className={styles.submitBtn}>Submit Order</button>
                            <button onClick={resetOrderForm} className={styles.cancelBtn}>Reset</button>
                        </div>
                    </div>
                )}

                {activeTab === "orders" && (
                    <div>
                        <h2>My Orders</h2>
                        <div className={styles.filterContainer}>
                            <label>Party: </label>
                            <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)}>
                                <option value="">All</option>
                                {parties.map((p) => (
                                    <option key={p.id} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                            <label>Start Date: </label>
                            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                            <label>End Date: </label>
                            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                        </div>
                        {renderOrdersList()}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DirectOrderDashboard;
