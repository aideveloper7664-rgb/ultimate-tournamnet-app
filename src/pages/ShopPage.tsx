import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, update, push, db } from '../firebase';
import { ShopProduct, ShopOrder } from '../types';

export const ShopPage: React.FC = () => {
  const { currentUser, userProfile, reloadUserProfile, showSection } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [viewingProduct, setViewingProduct] = useState<ShopProduct | null>(null);
  const [buyingProduct, setBuyingProduct] = useState<ShopProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: ''
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderStatusMsg, setOrderStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchShopData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const prodRef = ref(db, 'shopProducts');
        const prodSnap = await get(prodRef);
        if (prodSnap.exists()) {
          const val = prodSnap.val();
          const list: ShopProduct[] = Object.entries(val).map(([id, p]: [string, any]) => ({
            id,
            ...p
          }));
          setProducts(list);
        } else {
          // Starter high quality products
          setProducts([
            {
              id: 'prod_jersey',
              name: 'Pro Esports Gaming Jersey (Custom Name)',
              price: 499,
              imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&auto=format&fit=crop&q=80',
              description: 'Official tournament dry-fit esports jersey with your custom in-game name printed on back. All sizes available.',
              status: 'active'
            },
            {
              id: 'prod_headset',
              name: 'Surround Sound Gaming Headset 7.1',
              price: 899,
              imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=80',
              description: 'Ultra low latency, noise cancelling microphone, crystal clear footstep audio for competitive battle royale matches.',
              status: 'active'
            },
            {
              id: 'prod_sleeves',
              name: 'Anti-Sweat Pro Gaming Finger Sleeves (4 Pairs)',
              price: 199,
              imageUrl: 'https://images.unsplash.com/photo-1612287233207-6f81c9a623a8?w=500&auto=format&fit=crop&q=80',
              description: 'Silver fiber conductive finger sleeves for maximum touch screen accuracy and zero friction aim tracking.',
              status: 'active'
            },
            {
              id: 'prod_diamonds',
              name: '1060 + 106 Bonus In-Game Diamonds Pack',
              price: 799,
              imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
              description: 'Instant direct in-game UID topup. Enter your player UID in order notes for instant transfer within 30 minutes.',
              status: 'active'
            }
          ]);
        }

        // Fetch user orders
        if (currentUser) {
          const ordRef = ref(db, 'shopOrders');
          const ordSnap = await get(ordRef);
          if (ordSnap.exists()) {
            const val = ordSnap.val();
            const list: ShopOrder[] = Object.entries(val)
              .map(([id, o]: [string, any]) => ({ id, ...o }))
              .filter(o => o.userId === currentUser.uid);
            list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setOrders(list);
          } else {
            setOrders([]);
          }
        }
      } catch (err) {
        console.error('Error fetching shop data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [currentUser]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !buyingProduct || isSubmitting) return;

    const userBal = userProfile?.balance || 0;
    if (userBal < buyingProduct.price) {
      setOrderStatusMsg({ text: 'Insufficient balance! Please add funds in your wallet.', type: 'error' });
      return;
    }

    if (!formData.name.trim() || !formData.phone.trim() || !formData.address.trim()) {
      setOrderStatusMsg({ text: 'Please fill in all required shipping fields.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setOrderStatusMsg(null);

    try {
      const newBal = userBal - buyingProduct.price;

      // 1. Deduct balance
      await update(ref(db, `users/${currentUser.uid}`), {
        balance: newBal
      });

      // 2. Save order
      const newOrder: Omit<ShopOrder, 'id'> = {
        userId: currentUser.uid,
        userName: formData.name.trim(),
        userPhone: formData.phone.trim(),
        deliveryAddress: formData.address.trim(),
        productId: buyingProduct.id,
        productName: buyingProduct.name,
        price: buyingProduct.price,
        note: formData.note.trim() || '',
        status: 'pending',
        timestamp: Date.now()
      };

      const orderRef = await push(ref(db, 'shopOrders'), newOrder);

      // 3. Log transaction
      await push(ref(db, `transactions/${currentUser.uid}`), {
        type: 'shop',
        amount: -buyingProduct.price,
        description: `Store Order: ${buyingProduct.name}`,
        timestamp: Date.now()
      });

      setOrders(prev => [{ id: orderRef.key as string, ...newOrder }, ...prev]);
      await reloadUserProfile();

      setOrderStatusMsg({ text: 'Order placed successfully! Admin will process shipment.', type: 'success' });
      setTimeout(() => {
        setBuyingProduct(null);
        setOrderStatusMsg(null);
        setActiveTab('orders');
        setFormData({ name: '', phone: '', address: '', note: '' });
      }, 1500);
    } catch (err: any) {
      setOrderStatusMsg({ text: err.message || 'Failed to place order.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="shop-section" className="section active px-3 py-2 pb-5">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 pt-2">
        <button
          type="button"
          className="btn btn-sm btn-dark border border-secondary border-opacity-30 rounded-circle p-2"
          onClick={() => showSection('earn-section')}
        >
          <i className="bi bi-arrow-left fs-5"></i>
        </button>
        <h4 className="fw-extrabold text-white m-0 d-flex align-items-center gap-2">
          <i className="bi bi-cart-check-fill text-purple-400"></i> Gaming Store
        </h4>
        <div style={{ width: '38px' }}></div>
      </div>

      {/* Tabs */}
      <div
        className="d-flex p-1 rounded-3 mb-4 gap-1.5"
        style={{ background: '#0a0d20', border: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        <button
          type="button"
          className="flex-fill btn btn-sm border-0 fw-bold py-2 rounded-2 transition-all"
          style={{
            background: activeTab === 'products' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
            color: activeTab === 'products' ? '#0f172a' : '#94a3b8',
            boxShadow: activeTab === 'products' ? '0 4px 12px rgba(250, 204, 21, 0.3)' : 'none'
          }}
          onClick={() => setActiveTab('products')}
        >
          <i className="bi bi-grid-fill me-1.5"></i> Store Products
        </button>
        <button
          type="button"
          className="flex-fill btn btn-sm border-0 fw-bold py-2 rounded-2 transition-all"
          style={{
            background: activeTab === 'orders' ? 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' : 'transparent',
            color: activeTab === 'orders' ? '#0f172a' : '#94a3b8',
            boxShadow: activeTab === 'orders' ? '0 4px 12px rgba(250, 204, 21, 0.3)' : 'none'
          }}
          onClick={() => setActiveTab('orders')}
        >
          <i className="bi bi-box-seam me-1.5"></i> My Orders ({orders.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="text-secondary small mt-2">Loading store catalog...</p>
        </div>
      ) : activeTab === 'products' ? (
        <div className="row g-3">
          {products.map((p) => (
            <div key={p.id} className="col-6">
              <div
                className="rounded-4 overflow-hidden border shadow-sm h-100 d-flex flex-column"
                style={{
                  background: 'linear-gradient(145deg, #131738 0%, #0a0d22 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div style={{ aspectRatio: '1 / 1', overflow: 'hidden' }}>
                  <img
                    src={p.imageUrl || 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&auto=format&fit=crop&q=80'}
                    alt={p.name}
                    className="w-100 h-100 object-fit-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-3 d-flex flex-column flex-grow-1 text-center">
                  <h6 className="fw-bold text-white mb-1 small text-truncate" title={p.name}>
                    {p.name}
                  </h6>
                  <strong className="text-success fs-5 fw-extrabold mb-2 font-mono">
                    ₹{p.price}
                  </strong>

                  <div className="mt-auto d-flex flex-column gap-1.5">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary text-light py-1.5 fw-bold rounded-2 small"
                      onClick={() => setViewingProduct(p)}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-warning py-1.5 fw-extrabold text-dark rounded-2 shadow-sm"
                      style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
                      onClick={() => {
                        setBuyingProduct(p);
                        setOrderStatusMsg(null);
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Orders List */
        <div className="d-flex flex-column gap-3">
          {orders.length > 0 ? (
            orders.map((o) => (
              <div
                key={o.id}
                className="p-3 rounded-4 border shadow-sm"
                style={{
                  background: 'linear-gradient(145deg, #131738 0%, #0a0d22 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="fw-bold text-white mb-0 fs-6">{o.productName}</h6>
                    <small className="text-secondary extra-small font-mono">
                      Order ID: #{o.id.substring(0, 8).toUpperCase()}
                    </small>
                  </div>
                  <span
                    className={`badge font-mono extra-small ${o.status === 'completed' ? 'bg-success bg-opacity-20 text-success border border-success border-opacity-30' : 'bg-warning bg-opacity-20 text-warning border border-warning border-opacity-30'}`}
                  >
                    {o.status.toUpperCase()}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-secondary small">Total Paid:</span>
                  <strong className="text-success fs-6 font-mono">₹{o.price}</strong>
                </div>

                <div
                  className="p-2 rounded-3 text-center"
                  style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px dashed #38bdf8' }}
                >
                  <span className="text-info extra-small fw-bold">
                    <i className="bi bi-info-circle-fill me-1"></i>
                    Admin will process delivery to: {o.deliveryAddress}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-5">
              <i className="bi bi-bag-x text-secondary fs-1 mb-2"></i>
              <p className="text-secondary small">You haven't ordered any products yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Product Details Modal */}
      {viewingProduct && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="card border-0 rounded-4 shadow-2xl text-white p-4 w-100"
            style={{ maxWidth: '400px', background: 'linear-gradient(165deg, #131738 0%, #0a0d22 100%)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-white mb-0">Product Details</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setViewingProduct(null)}
              ></button>
            </div>

            <div className="text-center mb-3">
              <img
                src={viewingProduct.imageUrl}
                alt={viewingProduct.name}
                className="rounded-3 w-100 object-fit-cover mb-3"
                style={{ height: '180px' }}
              />
              <h5 className="fw-bold text-white fs-6 mb-1">{viewingProduct.name}</h5>
              <strong className="text-success fs-4 fw-extrabold font-mono">₹{viewingProduct.price}</strong>
            </div>

            <div
              className="p-3 rounded-3 mb-4"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="extra-small text-secondary fw-bold text-uppercase d-block mb-1">Description</span>
              <p className="small text-light mb-0" style={{ lineHeight: 1.5 }}>
                {viewingProduct.description}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-warning w-100 py-2.5 fw-extrabold text-dark rounded-3 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
              onClick={() => {
                const prod = viewingProduct;
                setViewingProduct(null);
                setBuyingProduct(prod);
              }}
            >
              Buy Now (₹{viewingProduct.price})
            </button>
          </div>
        </div>
      )}

      {/* Checkout Order Form Modal */}
      {buyingProduct && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ zIndex: 1085, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div
            className="card border-0 rounded-4 shadow-2xl text-white p-4 w-100"
            style={{ maxWidth: '420px', background: 'linear-gradient(165deg, #131738 0%, #0a0d22 100%)', border: '1px solid rgba(250, 204, 21, 0.3)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-white mb-0">Checkout Order</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setBuyingProduct(null)}
              ></button>
            </div>

            {/* Product summary header */}
            <div className="d-flex align-items-center gap-3 p-2.5 rounded-3 mb-3" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <img src={buyingProduct.imageUrl} alt="" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
              <div>
                <div className="fw-bold text-white small">{buyingProduct.name}</div>
                <strong className="text-success fs-6 font-mono">₹{buyingProduct.price}</strong>
              </div>
            </div>

            <form onSubmit={handleCheckoutSubmit}>
              <div className="mb-2.5">
                <label className="form-label extra-small text-secondary fw-bold">Full Name *</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-40"
                  placeholder="Receiver's name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label extra-small text-secondary fw-bold">Phone Number *</label>
                <input
                  type="tel"
                  className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-40 font-mono"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="mb-2.5">
                <label className="form-label extra-small text-secondary fw-bold">Complete Delivery Address / In-Game UID *</label>
                <textarea
                  className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-40"
                  rows={2}
                  placeholder="House No, Street, City, State, PIN or Player UID for topup"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                ></textarea>
              </div>

              <div className="mb-3">
                <label className="form-label extra-small text-secondary fw-bold">Note / Size (Optional)</label>
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-40"
                  placeholder="e.g. Size M, or in-game nickname"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>

              {orderStatusMsg && (
                <div className={`p-2 rounded-3 small text-center mb-3 ${orderStatusMsg.type === 'success' ? 'bg-success bg-opacity-20 text-success border border-success border-opacity-30' : 'bg-danger bg-opacity-20 text-danger border border-danger border-opacity-30'}`}>
                  {orderStatusMsg.text}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-warning w-100 py-2.5 fw-extrabold text-dark rounded-3 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Placing Order...' : `Pay ₹${buyingProduct.price} & Place Order`}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
