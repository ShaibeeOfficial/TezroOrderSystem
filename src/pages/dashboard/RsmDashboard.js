// src/pages/RsmDashboard.js
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/Dashboard/RsmDashboard.module.css";

const RsmDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("Pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [soFilter, setSoFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  // const [commitmentDateFilter, setCommitmentDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const ordersPerPage = 5;

  const navigate = useNavigate();

  const fetchOrders = async () => {
    setIsLoading(true);
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "orders"),
      where("rsmId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const data = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const orderData = docSnap.data();
        let soName = "N/A";

        if (orderData.soId) {
          try {
            const soDoc = await getDocs(
              query(collection(db, "users"), where("__name__", "==", orderData.soId))
            );
            soDoc.forEach((doc) => {
              const u = doc.data();
              soName = u.name || u.email || "S.O.";
            });
          } catch (err) {
            console.error("Failed to fetch SO:", err);
          }
        }

        return {
          id: docSnap.id,
          ...orderData,
          soName,
          products: orderData.products
            ? orderData.products.filter(product => product.addedBy !== "LM")
            : [],
        };
      })
    );

    setOrders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (activeStatus !== "All") {
      filtered = filtered.filter((order) => order.status === activeStatus);
    }

    if (soFilter !== "All") {
      filtered = filtered.filter((order) => order.soName === soFilter);
    }

    if (partyFilter !== "All") {
      filtered = filtered.filter((order) => order.partyName === partyFilter);
    }

    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      filtered = filtered.filter(
        (order) => order.createdAt?.toDate && order.createdAt.toDate() >= fromDate
      );
    }

    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (order) => order.createdAt?.toDate && order.createdAt.toDate() <= toDate
      );
    }

    // if (commitmentDateFilter) {
    //   const targetDate = new Date(commitmentDateFilter);
    //   targetDate.setHours(0, 0, 0, 0);
    //   filtered = filtered.filter((order) => {
    //     const cDate = order.commitmentDate?.toDate?.();
    //     return (
    //       cDate &&
    //       cDate.getFullYear() === targetDate.getFullYear() &&
    //       cDate.getMonth() === targetDate.getMonth() &&
    //       cDate.getDate() === targetDate.getDate()
    //     );
    //   });
    // }

    filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, activeStatus, soFilter, partyFilter, dateRange]);

  const handleCommitmentChange = (orderId, field, value) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, [field]: value } : order
      )
    );
  };

  const handleApprove = async (orderId) => {
    const order = orders.find((o) => o.id === orderId);

    if (!order.commitmentOfPayment || !order.commitmentDate) {
      alert("Please enter both Commitment Message and Date before approving.");
      return;
    }

    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: "RSM Submitted",
      approvedBy: auth.currentUser.uid,
      commitmentOfPayment: order.commitmentOfPayment,
      commitmentDate: new Date(order.commitmentDate),
    });

    fetchOrders();
  };

  const handleReject = async (orderId) => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: "Rejected By RSM",
      approvedBy: auth.currentUser.uid,
    });
    fetchOrders();
  };

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>RSM Dashboard</h1>
        <button
          onClick={async () => {
            await auth.signOut();
            navigate("/");
          }}
          className={styles.logout}
        >
          Logout
        </button>
      </header>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <button
            className={styles.refreshBtn}
            onClick={fetchOrders}
            disabled={isLoading}
          >
            🔄 {isLoading ? "Refreshing..." : "Refresh Orders"}
          </button>
          {["All", "Pending", "Approved", "Rejected"].map((status) => (
            <button
              key={status}
              className={`${styles.statusBtn} ${activeStatus === status ? styles.active : ""}`}
              onClick={() => setActiveStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className={styles.filterControls}>
          <select value={soFilter} onChange={(e) => setSoFilter(e.target.value)}>
            <option value="All">All SOs</option>
            {[...new Set(orders.map((o) => o.soName))].map((so, idx) => (
              <option key={idx} value={so}>{so}</option>
            ))}
          </select>

          <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)}>
            <option value="All">All Parties</option>
            {[...new Set(orders.map((o) => o.partyName))].map((party, idx) => (
              <option key={idx} value={party}>{party}</option>
            ))}
          </select>

          <label>From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          />
          <label>To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          />

          {/* <label>Commitment Date</label>
          <input
            type="date"
            value={commitmentDateFilter}
            onChange={(e) => setCommitmentDateFilter(e.target.value)}
          /> */}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.loader}>
            <div className={styles.spinner}></div>
            Loading orders...
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>T.M</th>
                <th>Party</th>
                <th>Commitment</th>
                <th>Status</th>
                <th>Products</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr
                  key={order.id}
                  style={{
                    backgroundColor:
                      order.status === "Approved"
                        ? "#d4edda"
                        : order.status === "Rejected"
                        ? "#f8d7da"
                        : "transparent",
                  }}
                >
                  <td>{order.createdAt?.toDate?.().toLocaleDateString() || "N/A"}</td>
                  <td>{order.soName}</td>
                  <td>{order.partyName}</td>
                  <td>
                    {order.status === "Pending" ? (
                      <>
                        <textarea
                          value={order.commitmentOfPayment || ""}
                          onChange={(e) =>
                            handleCommitmentChange(order.id, "commitmentOfPayment", e.target.value)
                          }
                          placeholder="Enter commitment message"
                          style={{ width: "100%", marginBottom: "4px" }}
                        />
                        <input
                          type="date"
                          value={order.commitmentDate || ""}
                          onChange={(e) =>
                            handleCommitmentChange(order.id, "commitmentDate", e.target.value)
                          }
                        />
                      </>
                    ) : (
                      <>
                        <div>{order.commitmentOfPayment || "—"}</div>
                        <div>
                          📅{" "}
                          {order.commitmentDate?.toDate?.().toLocaleDateString() || "—"}
                        </div>
                      </>
                    )}
                  </td>
                  <td>{order.status}</td>
                  <td>
                    <table className={styles.innerTable}>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Product</th>
                          <th>Variety</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.products?.map((product, i) => (
                          <tr key={i}>
                            <td>{product.category || "N/A"}</td>
                            <td>{product.name || "N/A"}</td>
                            <td>{product.variety || "N/A"}</td>
                            <td>{product.quantity || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                  <td>
                    {order.status === "Pending" && (
                      <>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleApprove(order.id)}
                          style={{ marginRight: "6px" }}
                        >
                          Approve
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleReject(order.id)}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!paginatedOrders.length && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "10px" }}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.activePage : ""}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RsmDashboard;
