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
import logo from "../../assets/logo.jpg"; // adjust path as needed
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


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
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  const ordersPerPage = 10;

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


  const handleExportPDF = async () => {
    const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));
    const doc = new jsPDF();

    const logoData = await toDataURL(logo); // full-color logo for top
    const watermarkData = await toDataURLWithOpacity(logo, 0.05); // transparent watermark

    selectedOrders.forEach((order, index) => {
      if (index > 0) doc.addPage();

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      // 💧 Add faded watermark behind content
      doc.addImage(
        watermarkData,
        "PNG", // must be PNG to preserve transparency
        centerX - 50,
        pageHeight / 2 - 50,
        100,
        100
      );

      // 🖼️ Add full-color logo + title at the top
      doc.addImage(logoData, "JPEG", centerX - 45, 10, 18, 18); // smaller logo
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("TEZRO SEED PVT LTD", centerX + 5, 22, { align: "center" });
      doc.setFontSize(11);

      let y = 38;
      const labelWidth = 50;
      const valueWidth = 130;

      const drawField = (label, value) => {
        const wrapped = doc.splitTextToSize(value || "N/A", valueWidth);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 14, y);
        doc.setFont("helvetica", "normal");
        doc.text(wrapped, 14 + labelWidth, y);
        y += wrapped.length * 6 + 2;
      };

      drawField("Order Ref", order.refCode || "N/A");
      drawField("Order Placed By", order.soName);
      drawField("BM / RSM", order.rsmName || "N/A");
      drawField("Party Code", order.partyCode || "N/A");
      drawField("Party Name", order.partyName || "N/A");
      drawField("Party Mobile", order.partyMobile || "N/A");
      drawField("Status", order.status || "N/A");
      drawField("POD", order.pod || "N/A");
      drawField("Contact Info", order.contactInfo || "N/A");
      drawField("Commitment Message", order.commitmentOfPayment || order.commitmentMessage || "N/A");

      const commitmentDate = order.commitmentDate?.toDate?.()?.toLocaleDateString() || "N/A";
      drawField("Commitment Date", commitmentDate);


      const tableBody = (order.products || []).map(product => [
        product.season || "N/A",
        product.category || "N/A",
        product.name || "N/A",
        product.variety || "N/A",
        product.quantity?.toString() || "0",
      ]);

      autoTable(doc, {
        startY: y + 5,
        head: [["Season", "Category", "Product", "Variety", "Qty"]],
        body: tableBody,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [22, 160, 133],
          textColor: 255,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 15 },
        }
      });
    });

    doc.save("Order_List.pdf");
  };



  function toDataURLWithOpacity(url, opacity = 0.05) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        // Clear canvas to support transparency
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set global alpha for opacity
        ctx.globalAlpha = opacity;
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL("image/png")); // use PNG for transparency
      };
      img.onerror = reject;
    });
  }


  // 📌 Helper: Convert image to base64
  function toDataURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg"));
      };
      img.onerror = reject;
    });
  }




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
      status: "BM/RSM Submitted",
      approvedBy: auth.currentUser.uid,
      commitmentOfPayment: order.commitmentOfPayment,
      commitmentDate: new Date(order.commitmentDate),
    });

    fetchOrders();
  };

  const handleReject = async (orderId) => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status: "Rejected By BM/RSM",
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
        <div className={styles.logoContainer}>
          <img
            src={logo || "/logo.png"} // use imported logo if available, fallback to public path
            alt="Logo"
            className={styles.logo}
          />
          <h2>BSM/RSM Dashboard</h2>
        </div>
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
          {["All", "Pending", "Approved", "Rejected", "Rejected By Logistic"].map((status) => (
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
            <option value="All">All T.Ms</option>
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
          <button
            onClick={handleExportPDF}
            disabled={selectedOrderIds.length === 0}
            className={styles.exportButton}
          >
            📝 Export PDF
          </button>
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
                <th><input
                  type="checkbox"
                  checked={
                    paginatedOrders.length > 0 &&
                    paginatedOrders.every((order) => selectedOrderIds.includes(order.id))
                  }
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const pageOrderIds = paginatedOrders.map((order) => order.id);
                    setSelectedOrderIds((prevSelected) => {
                      if (isChecked) {
                        // Add all paginated orders (if not already included)
                        const newSet = new Set([...prevSelected, ...pageOrderIds]);
                        return Array.from(newSet);
                      } else {
                        // Remove all paginated orders
                        return prevSelected.filter((id) => !pageOrderIds.includes(id));
                      }
                    });
                  }}
                />Select</th>
                <th>Date</th>
                <th>T.M</th>
                <th>Party</th>
                <th>Party Number</th>
                <th>POD</th>
                <th>Contact Info</th>
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
                  className={`${styles.orderRow} ${order.status === "Approved"
                      ? styles.approvedBorder
                      : order.status === "Rejected" || order.status === "Rejected By BM/RSM" || order.status === "Rejected By Logistic"
                        ? styles.rejectedBorder
                        : styles.pendingBorder
                    }`}
                >
                  {/* chechbox table data  */}
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setSelectedOrderIds((prev) =>
                          isChecked ? [...prev, order.id] : prev.filter((id) => id !== order.id)
                        );
                      }}
                    />
                  </td>
                  <td>{order.createdAt?.toDate?.().toLocaleDateString() || "N/A"}</td>
                  <td>{order.soName}</td>
                  <td>{order.partyName}</td>
                  <td>{order.phone || order.partyMobile || 'N/A'}</td>
                  <td>{order.pod || 'N/A'}</td>
                  <td>{order.contactInfo}</td>
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
