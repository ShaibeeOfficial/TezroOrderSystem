// LogisticManagerDashboard.js
import React, { useState, useEffect } from 'react';
import styles from '../../styles/Dashboard/LogisticManagerDashboard.module.css';
import { auth, db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { FaSignOutAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import logo from "../../assets/logo.jpg"; // adjust path as needed
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



const ORDERS_PER_PAGE = 10;

const LogisticManagerDashboard = () => {
  const [userName, setUserName] = useState("");
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState("BM/RSM Submitted");
  const [soFilter, setSoFilter] = useState("All");
  const [rsmFilter, setRsmFilter] = useState("All");
  const [partyFilter, setPartyFilter] = useState("All");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [commitmentDateFilter, setCommitmentDateFilter] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [selectedRejectOrderId, setSelectedRejectOrderId] = useState(null);
  const [viewRejectMessage, setViewRejectMessage] = useState(''); // new
  const [viewRejectModalOpen, setViewRejectModalOpen] = useState(false); // new
  const [isRejecting, setIsRejecting] = useState(false);





  const navigate = useNavigate();

  const fetchUserName = async () => {
    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserName(userData.name || "Boss");
      }
    }
  };


  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("status", "in", ["BM/RSM Submitted", "Placed", "Logistic Reviewed", "Approved", "Rejected", "Rejected By Logistic"]),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const orderData = docSnap.data();
          let soName = "N/A";
          let rsmName = orderData.rsmName || "N/A";
          let finalApprovedByName = "N/A";

          // 🔹 Fetch SO Name
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

          // 🔹 Fetch Final Approval Name
          if (orderData.finalApprovedBy) {
            try {
              const userDoc = await getDoc(doc(db, "users", orderData.finalApprovedBy));
              if (userDoc.exists()) {
                finalApprovedByName = userDoc.data().name || userDoc.data().email || "Boss";
              }
            } catch (err) {
              console.error("Failed to fetch final approver:", err);
            }
          }

          const balance = (orderData.products || []).reduce((acc, product) => {
            const credit = parseFloat(product.credit || 0);
            const debit = parseFloat(product.debit || 0);
            return acc + (credit - debit);
          }, 0);

          return {
            id: docSnap.id,
            ...orderData,
            soName,
            rsmName,
            balance,
            finalApprovedByName, // 👈 Add it here
            partyCode: orderData.partyCode || '-',
          };
        })
      );

      // ✅ Filter orders by user email
      const currentUser = auth.currentUser;
      let filteredData = data;

      if (currentUser?.email === "uzairkhan@tezro.pk") {
        filteredData = data.filter(order =>
          order.products?.some(p => {
            const category = (p.category || "").toLowerCase();
            const name = (p.name || "").toLowerCase();
            const quantity = parseFloat(p.quantity || 0);

            // Only include real products
            const isLedgerEntry = name === "n/a" || quantity === 0;

            return !isLedgerEntry && (category === "vegetables" || category === "pearl millet" || category === "hyrbid mustard" || category === "mustard");
          })
        );
      } else if (currentUser?.email === "shakil@tezro.pk") {
        filteredData = data.filter(order =>
          order.products?.every(p => {
            const category = (p.category || "").toLowerCase();
            const name = (p.name || "").toLowerCase();
            const quantity = parseFloat(p.quantity || 0);

            // Only consider real products
            const isLedgerEntry = name === "n/a" || quantity === 0;

            return isLedgerEntry || (category !== "vegetables" && category !== "pearl millet" && category !== "hyrbid mustard" && category !== "mustard");
          })
        );
      }



      setOrders(filteredData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
    setIsLoading(false);
  };


  useEffect(() => {
    fetchOrders();
    fetchUserName();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (activeStatus !== "All") {
      if (activeStatus === "Rejected") {
        filtered = filtered.filter(
          (order) => order.status === "Rejected" || order.status === "Rejected By Logistic"
        );
      } else {
        filtered = filtered.filter((order) => order.status === activeStatus);
      }
    }

    if (soFilter !== "All") {
      filtered = filtered.filter((order) => order.soName === soFilter);
    }

    if (rsmFilter !== "All") {
      filtered = filtered.filter((order) => order.rsmName === rsmFilter);
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

    if (commitmentDateFilter) {
      const targetDate = new Date(commitmentDateFilter);
      targetDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((order) => {
        const cDate = order.commitmentDate?.toDate?.();
        return (
          cDate &&
          cDate.getFullYear() === targetDate.getFullYear() &&
          cDate.getMonth() === targetDate.getMonth() &&
          cDate.getDate() === targetDate.getDate()
        );
      });
    }

    setFilteredOrders(filtered);
    setCurrentPage(1);
  }, [orders, activeStatus, soFilter, rsmFilter, partyFilter, dateRange, commitmentDateFilter]);


  const handleExportPDF = async () => {
    const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));
    const doc = new jsPDF();

    const logoData = await toDataURL(logo);
    const watermarkData = await toDataURLWithOpacity(logo, 0.05);

    selectedOrders.forEach((order, index) => {
      if (index > 0) doc.addPage();

      const pageWidth = doc.internal.pageSize.getWidth();
      // const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;

      // 💧 Watermark
      // Estimate content height
      const estimatedFieldHeight = 7 * 6 + 2 * 7; // 7 fields approx.
      const productRows = order.products || [];
      const estimatedTableHeight = productRows.length * 8; // ~8 units per row

      const contentStartY = 38;
      const contentHeight = estimatedFieldHeight + estimatedTableHeight;
      const contentCenterY = contentStartY + contentHeight / 2;

      doc.addImage(watermarkData, "PNG", centerX - 50, contentCenterY - 50, 100, 100);


      // 🖼️ Logo + Heading
      doc.addImage(logoData, "JPEG", centerX - 45, 10, 18, 18);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("TEZRO SEED PVT LTD", centerX + 5, 22, { align: "center" });
      doc.setFontSize(11);

      let y = 38;

      const drawField = (label, value) => {
        const labelWidth = 45;
        const valueWidth = 130;
        const wrapped = doc.splitTextToSize(value || "N/A", valueWidth);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 14, y);
        doc.setFont("helvetica", "normal");
        doc.text(wrapped, 14 + labelWidth, y);
        y += wrapped.length * 6 + 2;
      };

      // 🔷 Order-level fields
      // drawField("Order Ref", order.refCode || "N/A");
      drawField("Order By", order.soName || "N/A");
      drawField("BM / RSM", order.rsmName || "N/A");
      drawField("Party Code", order.partyCode || "N/A");
      drawField("Party Name", order.partyName || "N/A");
      drawField("Party Mobile", order.partyMobile || "N/A");
      drawField("POD", order.pod || "N/A");
      drawField("Contact Info", order.contactInfo || "N/A");

      const commitmentText = `${order.commitmentOfPayment || order.commitmentMessage || "N/A"
        } (${order.commitmentDate?.toDate?.()?.toLocaleDateString() || "N/A"})`;

      const balanceText =
        order.balance > 0
          ? `Rs. ${order.balance} (Credit)`
          : order.balance < 0
            ? `Rs. ${Math.abs(order.balance)} (Debit)`
            : "Rs. 0";

      const finalApprovalBy = order.finalApprovedByName || "N/A";
      const status = order.status || "N/A";
      const products = order.products || [];

      // 🧾 Build table body with rowSpan for merged cells
      const body = products.map((product, i) => {
        const row = [
          doc.splitTextToSize(product.season || "N/A", 20),
          doc.splitTextToSize(product.category || "N/A", 25),
          doc.splitTextToSize(product.name || "N/A", 25),
          doc.splitTextToSize(product.variety || "N/A", 20),
          doc.splitTextToSize(product.quantity?.toString() || "0", 10),
          doc.splitTextToSize(product.credit ? `Rs. ${product.credit}` : "0", 20),
          doc.splitTextToSize(product.debit ? `Rs. ${product.debit}` : "0", 20),
        ];

        if (i === 0) {
          row.push(
            { content: balanceText, rowSpan: products.length, styles: { halign: 'center' } },
            { content: commitmentText, rowSpan: products.length, styles: { halign: 'center', fontStyle: 'italic' } },
            { content: status, rowSpan: products.length, styles: { halign: 'center' } },
            { content: finalApprovalBy, rowSpan: products.length, styles: { halign: 'center' } }
          );
        }

        return row;
      });

      autoTable(doc, {
        startY: y + 5,
        head: [[
          "Season", "Category", "Product", "Variety", "Qty",
          "Credit", "Debit", "Balance", "Commitment", "Status", "Final Approval By"
        ]],
        body,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 1,
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [22, 160, 133],
          textColor: 255,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 12 },  // Season
          1: { cellWidth: 18 },  // Category
          2: { cellWidth: 18 },  // Product
          3: { cellWidth: 15 },  // Variety
          4: { cellWidth: 7 },  // Qty
          5: { cellWidth: 15 },  // Credit
          6: { cellWidth: 15 },  // Debit
          7: { cellWidth: 25 },  // Balance
          8: { cellWidth: 20 },  // Commitment
          9: { cellWidth: 14 },  // Status
          10: { cellWidth: 25 }  // Final Approval By
        }
      });
    });

    doc.save("Order_List.pdf");
    toast.success("PDF Exported Successfully!");
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



  const handleExportSelected = () => {
    const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));

    const data = selectedOrders.map(order => {
      const products = order.products || [];

      return {
        OrderDate: order.createdAt?.toDate?.().toLocaleDateString('en-GB') || '',
        SO: order.soName,
        ApprovedBy: order.rsmName,
        PartyCode: order.partyCode,
        PartyName: order.partyName,
        Mobile: order.partyMobile,
        POD: order.pod,
        contactInfo: order.contactInfo,
        CommitmentMessage: order.commitmentOfPayment || '',
        CommitmentDate: order.commitmentDate?.toDate?.().toISOString().split('T')[0] || '',
        Products: products.map(p => p.name || '').join('\n'),
        Varieties: products.map(p => p.variety || '').join('\n'),
        Seasons: products.map(p => p.season || '').join('\n'),
        Categories: products.map(p => p.category || '').join('\n'),
        Quantities: products.map(p => p.quantity ?? '').join('\n'),
        Debits: products.map(p => p.debit ?? '').join('\n'),
        Credits: products.map(p => p.credit ?? '').join('\n'),
        Balance: order.Balance,
        OrderStatus: order.status,
        FinalApprovalBy: order.finalApprovedByName,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Order Lis");
    XLSX.writeFile(workbook, "Order_Lis.xlsx");
    toast.success("Excel File Exported Successfully");
  };



  const handleProductChange = (orderId, index, field, value) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? {
            ...order,
            products: order.products.map((product, i) =>
              i === index ? { ...product, [field]: value } : product
            ),
          }
          : order
      )
    );
  };

  const handleAddProduct = (orderId) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? {
            ...order,
            products: [
              ...order.products,
              {
                season: '',
                category: '',
                name: 'N/A',
                variety: 'N/A',
                quantity: 0,
                debit: '',
                credit: '',
                addedBy: 'LM' // ✅ Tag this product
              }
            ]
          }
          : order
      )
    );
    toast.success("New Product Added Successfully");
  };

  const handleRemoveProduct = (orderId, indexToRemove) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? {
            ...order,
            products: order.products.filter((_, i) => i !== indexToRemove),
          }
          : order
      )
    );
    toast.info("Product Removed Successfully");
  };

  const handleApprove = async (order) => {
    try {
      const orderRef = doc(db, 'orders', order.id);

      // Ensure credit/debit are stored as numbers
      const updatedProducts = order.products.map(p => ({
        ...p,
        credit: parseFloat(p.credit || 0),
        debit: parseFloat(p.debit || 0),
      }));

      // Recalculate total balance
      const totalBalance = updatedProducts.reduce((acc, p) => acc + (p.credit - p.debit), 0);

      await updateDoc(orderRef, {
        status: 'Logistic Reviewed',
        rejectionMessage: rejectionMessage.trim(),
        finalApprovedBy: '', // Clear previous approver
        products: updatedProducts, // ✅ Save updated product credit/debit
        balance: totalBalance      // ✅ Save balance (optional if used elsewhere)
      });

      toast.success("Order Approved Successfully");
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed To Approve Order");
    }
  };



  const handleReject = (orderId) => {
    setSelectedRejectOrderId(orderId);
    setShowRejectModal(true);
  };

  // ✨ New confirm function
  const confirmRejectOrderWithMessage = async () => {
    if (!rejectionMessage.trim()) {
      toast.error("Please Enter a Rejection Reason.");
      return;
    }

    setIsRejecting(true);

    try {
      const orderRef = doc(db, 'orders', selectedRejectOrderId);
      await updateDoc(orderRef, {
        status: 'Rejected By Logistic',
        rejectionMessage: rejectionMessage.trim(),
        finalApprovedBy: '',
      });

      toast.success("Order Rejected with Message");

      // Reset modal state
      setShowRejectModal(false);
      setRejectionMessage('');
      setSelectedRejectOrderId(null);
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed to Reject Order");
    } finally {
      setIsRejecting(false);
    }
  };



  const handleRevert = async (orderId) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'Pending',
        finalApprovedBy: '', // 👈 clear approval
      });
      toast.warn("Order Reverted To BM/RSM Successfully");
      await fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Failed To Revert Order");
    }
  };



  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '-';
    return format(timestamp.toDate(), 'HH:mm dd-MM-yyyy');
  };

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.logoContainer}>
            <img
              src={logo || "/logo.png"} // use imported logo if available, fallback to public path
              alt="Logo"
              className={styles.logo}
            />
            <div>
              <h2>Logistic Manager Dashboard</h2>
              {userName && <p className={styles.welcome}>Welcome {userName}</p>}
            </div>
          </div>
          <button className={styles.logoutButton} onClick={async () => {
            await auth.signOut();
            navigate("/");
          }}><FaSignOutAlt /> Logout</button>
        </div>

        <div className={styles.content}>
          <h2>Orders</h2>
          <div className={styles.controls}>
            <div className={styles.filters}>
              <button className={styles.refreshBtn} onClick={fetchOrders} disabled={isLoading}>
                🔄 {isLoading ? "Refreshing..." : "Refresh Orders"}
              </button>

              {["All", "BM/RSM Submitted", "Placed", "Approved", "Rejected"].map((status) => {
                let count = 0;

                if (status === "All") {
                  count = orders.length;
                } else if (status === "Rejected") {
                  count = orders.filter(
                    (order) =>
                      order.status === "Rejected" ||
                      order.status === "Rejected By BM/RSM" ||
                      order.status === "Rejected By Logistic"
                  ).length;
                } else {
                  count = orders.filter((order) => order.status === status).length;
                }

                return (
                  <button
                    key={status}
                    className={`${styles.statusBtn} ${activeStatus === status ? styles.active : ""}`}
                    onClick={() => setActiveStatus(status)}
                  >
                    {status} ({count})
                  </button>
                );
              })}
            </div>


            <div className={styles.filterControls}>
              <select value={rsmFilter} onChange={(e) => setRsmFilter(e.target.value)}>
                <option value="All">All BM/RSMs</option>
                {[...new Set(orders.map((o) => o.rsmName || "-"))].map((rsm, idx) => (
                  <option key={idx} value={rsm}>{rsm}</option>
                ))}
              </select>

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
              <div className={styles.dateFilter}>
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

                <label>Commitment Date</label>
                <input
                  type="date"
                  value={commitmentDateFilter}
                  onChange={(e) => setCommitmentDateFilter(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleExportSelected}
              disabled={selectedOrderIds.length === 0}
              className={styles.exportButton}
            >
              📤 Export
            </button>
            <button
              onClick={handleExportPDF}
              disabled={selectedOrderIds.length === 0}
              className={styles.exportButton}
            >
              📝 Export PDF
            </button>
          </div>


          {showRejectModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalBox}>
                <h2>Reject Order</h2>
                <textarea
                  className={styles.modalTextarea}
                  placeholder="Enter Rejection Reason..."
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                />
                <div className={styles.modalActions}>
                  <button
                    className={styles.modalCancelBtn}
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionMessage('');
                      setSelectedRejectOrderId(null);
                    }}
                    disabled={isRejecting}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.modalSubmitBtn}
                    onClick={confirmRejectOrderWithMessage}
                    disabled={isRejecting}
                  >
                    {isRejecting ? "Rejecting..." : "Confirm Reject"}
                  </button>
                </div>
              </div>
            </div>
          )}


          {viewRejectModalOpen && (
            <div className={styles.modalOverlay}>
              <div className={styles.modalBox}>
                <h2>Rejection Message</h2>
                <p>{viewRejectMessage}</p>
                <div className={styles.modalActions}>
                  <button
                    className={styles.modalCancelBtn}
                    onClick={() => {
                      setViewRejectModalOpen(false);
                      setViewRejectMessage('');
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}


          {isLoading ? <p>Loading orders...</p> : filteredOrders.length === 0 ? <p>No orders found.</p> : (
            <>
              <div className={styles.tableWrapper}>
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
                      <th>Order Placed By</th>
                      <th>BM/RSM</th>
                      <th>Party Code</th> {/* 👈 Add this */}
                      <th>Party Name</th>
                      <th>Party Number</th>
                      <th>POD</th>
                      <th>Contact Info</th>
                      <th>Products</th>
                      <th>Balance</th>
                      <th>Commitment</th> {/* 👈 Add this */}
                      <th>Status</th>
                      <th>Final Approval By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(order => (
                      <tr key={order.id} className={
                        order.status === "Approved"
                          ? styles.bossApproved
                          : (order.status === "Rejected" || order.status === "Rejected By Logistic")
                            ? styles.bossRejected
                            : ""
                      }>
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
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{order.soName || 'N/A'}</td>
                        <td>{order.rsmName || 'N/A'}</td>
                        <td>{order.partyCode || 'N/A'}</td>
                        <td>{order.partyName}</td>
                        <td>{order.partyMobile || order.phone || 'N/A'}</td>
                        <td>{order.pod || 'N/A'}</td>
                        <td>{order.contactInfo || 'N/A'}</td>
                        <td>
                          <table className={styles.innerTable}>
                            <thead>
                              <tr>
                                <th>Season</th> {/* <!-- 👈 Add this --> */}
                                <th>Category</th>
                                <th>Product</th>
                                <th>Variety</th>
                                <th>Qty</th>
                                <th>Credit</th>
                                <th>Debit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.products?.map((product, i) => (
                                <tr key={i}>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) ? (
                                      <input
                                        type="text"
                                        value={product.season || ''}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'season', e.target.value)
                                        }
                                      />
                                    ) : product.season || 'N/A'}
                                  </td>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) ? (
                                      <input
                                        type="text"
                                        value={product.category || ''}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'category', e.target.value)
                                        }
                                      />
                                    ) : product.category || 'N/A'}
                                  </td>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) ? (
                                      <input
                                        type="text"
                                        value={product.name || ''}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'name', e.target.value)
                                        }
                                      />
                                    ) : product.name || 'N/A'}
                                  </td>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) ? (
                                      <input
                                        type="text"
                                        value={product.variety || ''}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'variety', e.target.value)
                                        }
                                      />
                                    ) : product.variety || 'N/A'}
                                  </td>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) ? (
                                      <input
                                        type="number"
                                        value={product.quantity || 0}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'quantity', e.target.value)
                                        }
                                      />
                                    ) : product.quantity || 0}
                                  </td>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) ? (
                                      <input
                                        type="number"
                                        value={product.credit || ''}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'credit', e.target.value)
                                        }
                                      />
                                    ) : product.credit || '0'}
                                  </td>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) ? (
                                      <input
                                        type="number"
                                        value={product.debit || ''}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'debit', e.target.value)
                                        }
                                      />
                                    ) : product.debit || '0'}
                                  </td>
                                  <td>
                                    {["BM/RSM Submitted", "Placed"].includes(order.status) && (
                                      <button
                                        onClick={() => handleRemoveProduct(order.id, i)}
                                        className={styles.removeProductBtn}
                                      >
                                        ❌
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {["BM/RSM Submitted", "Placed"].includes(order.status) && (
                            <button
                              className={styles.addProductBtn}
                              onClick={() => handleAddProduct(order.id)}
                            >
                              ➕ Add Product
                            </button>
                          )}
                        </td>
                        <td>
                          {order.balance > 0
                            ? `Rs. ${order.balance} (Credit)`
                            : order.balance < 0
                              ? `Rs. ${Math.abs(order.balance)} (Debit)`
                              : "Rs. 0"}
                        </td>
                        <td>
                          <em>{order.commitmentOfPayment || order.commitmentMessage || ''}</em>
                          <br />
                          {order.commitmentDate
                            ? (order.commitmentDate.toDate
                              ? format(order.commitmentDate.toDate(), 'dd-MM-yyyy')
                              : format(new Date(order.commitmentDate), 'dd-MM-yyyy')
                            )
                            : 'N/A'}
                        </td>
                        <td>
                          {order.status}
                          {(order.status === "Rejected" || order.status === "Rejected By Logistic") && order.rejectionMessage && (
                            <span
                              title="View Rejection Message"
                              onClick={() => {
                                setViewRejectMessage(order.rejectionMessage);
                                setViewRejectModalOpen(true);
                              }}
                              style={{ marginLeft: 8, cursor: "pointer", color: "#e74c3c", fontWeight: "bold" }}
                            >
                              ❗
                            </span>
                          )}
                        </td>

                        <td>{order.finalApprovedByName || 'N/A'}</td>
                        <td>
                          {order.status === "BM/RSM Submitted" && (
                            <>
                              <button className={styles.approveBtn} onClick={() => handleApprove(order)}>Approve</button>
                              <button className={styles.rejectButton} onClick={() => handleReject(order.id)}>Reject</button>
                              <button className={styles.revertButton} onClick={() => handleRevert(order.id)}>Revert</button>
                            </>
                          )}
                          {order.status === "Placed" && (
                            <>
                              <button className={styles.approveBtn} onClick={() => handleApprove(order)}>Approve</button>
                              <button className={styles.rejectButton} onClick={() => handleReject(order.id)}>Reject</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Prev</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
              </div>
            </>
          )}
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default LogisticManagerDashboard;
