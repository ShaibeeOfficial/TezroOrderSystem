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
  orderBy
} from 'firebase/firestore';
import { FaSignOutAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';


const ORDERS_PER_PAGE = 10;

const LogisticManagerDashboard = () => {
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

  const navigate = useNavigate();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        where("status", "in", ["BM/RSM Submitted", "Placed", "Logistic Reviewed", "Approved", "Rejected"]),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);

      const data = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const orderData = docSnap.data();
          let soName = "N/A";
          let rsmName = orderData.rsmName || "N/A";

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
            partyCode: orderData.partyCode || '-', // ✅ Add this line
          };
        })
      );

      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
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


  const handleExportSelected = () => {
    const selectedOrders = orders.filter(order => selectedOrderIds.includes(order.id));

    const data = selectedOrders.map(order => {
      const products = order.products || [];

      return {
        OrderDate: order.createdAt?.toDate?.().toLocaleDateString('en-GB') || '',
        SO: order.soName,
        RSM: order.rsmName,
        Party: order.partyName,
        Status: order.status,
        CommitmentMessage: order.commitmentOfPayment || '',
        CommitmentDate: order.commitmentDate?.toDate?.().toISOString().split('T')[0] || '',
        Seasons: products.map(p => p.season || '').join('\n'),
        Categories: products.map(p => p.category || '').join('\n'),
        Products: products.map(p => p.name || '').join('\n'),
        Varieties: products.map(p => p.variety || '').join('\n'),
        Quantities: products.map(p => p.quantity ?? '').join('\n'),
        Debits: products.map(p => p.debit ?? '').join('\n'),
        Credits: products.map(p => p.credit ?? '').join('\n')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Order List");
    XLSX.writeFile(workbook, "Order_List.xlsx");
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
  };

  const handleApprove = async (order) => {
    const orderRef = doc(db, 'orders', order.id);

    const categoryBalances = {};
    order.products.forEach(p => {
      const category = p.category || 'Uncategorized';
      const debit = parseFloat(p.debit || 0);
      const credit = parseFloat(p.credit || 0);
      if (!categoryBalances[category]) {
        categoryBalances[category] = 0;
      }
      categoryBalances[category] += credit - debit;
    });

    await updateDoc(orderRef, {
      products: order.products,
      status: 'Logistic Reviewed',
      balanceByCategory: categoryBalances,
    });

    await fetchOrders();
  };

  const handleReject = async (orderId) => {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: 'Rejected by Logistic',
    });
    await fetchOrders();
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
          <h1>Logistic Manager Dashboard</h1>
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
                🔄 {isLoading ? "Refreshing..." : ""}
              </button>
              {["All", "BM/RSM Submitted", "Placed", "Approved", "Rejected"].map((status) => (
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
          </div>

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
                      <th>POD</th>
                      <th>Products</th>
                      <th>Commitment</th> {/* 👈 Add this */}
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map(order => (
                      <tr key={order.id} className={
                        order.status === "Approved" ? styles.bossApproved :
                          order.status === "Rejected" ? styles.bossRejected : ""
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
                        <td>{order.pod}</td>
                        <td>
                          <table className={styles.innerTable}>
                            <thead>
                              <tr>
                                <th>Season</th> {/* <!-- 👈 Add this --> */}
                                <th>Category</th>
                                <th>Product</th>
                                <th>Variety</th>
                                <th>Qty</th>
                                <th>Debit</th>
                                <th>Credit</th>
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
                                        value={product.debit || ''}
                                        onChange={(e) =>
                                          handleProductChange(order.id, i, 'debit', e.target.value)
                                        }
                                      />
                                    ) : product.debit || 'N/A'}
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
                                    ) : product.credit || 'N/A'}
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
                          <em>{order.commitmentOfPayment || order.commitmentMessage ||''}</em>
                          <br />
                          {order.commitmentDate
                            ? (order.commitmentDate.toDate
                              ? format(order.commitmentDate.toDate(), 'dd-MM-yyyy')
                              : format(new Date(order.commitmentDate), 'dd-MM-yyyy')
                            )
                            : 'N/A'}
                        </td>
                        <td>{order.status}</td>
                        <td>
                          {["BM/RSM Submitted", "Placed"].includes(order.status) && (
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
    </div>
  );
};

export default LogisticManagerDashboard;
