/**
 * Sepay Webhook Handler for Firebase Cloud Functions
 * Nhận webhook từ Sepay khi có giao dịch ngân hàng
 * Tự động cộng tiền vào tài khoản user
 */

const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Secret key để verify webhook (lấy từ Sepay dashboard)
const SEPAY_SECRET = process.env.SEPAY_SECRET || "your-sepay-secret-key";

/**
 * Webhook endpoint nhận thông báo giao dịch từ Sepay
 * URL: https://us-central1-license-manager-b0e4e.cloudfunctions.net/sepayWebhook
 */
exports.sepayWebhook = onRequest(
  { 
    region: "asia-southeast1",
    cors: true 
  },
  async (req, res) => {
    // Chỉ chấp nhận POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const data = req.body;
      
      // Log để debug
      console.log("Sepay webhook received:", JSON.stringify(data));

      // Sepay gửi các trường sau:
      // - id: ID giao dịch
      // - gateway: Tên ngân hàng
      // - transactionDate: Thời gian giao dịch
      // - accountNumber: Số tài khoản
      // - subAccount: Tài khoản phụ (nếu có)
      // - code: Mã giao dịch (nội dung chuyển khoản)
      // - content: Nội dung đầy đủ
      // - transferType: in/out
      // - transferAmount: Số tiền
      // - accumulated: Số dư tài khoản
      // - referenceCode: Mã tham chiếu

      const { transferType, transferAmount, content, code } = data;

      // Chỉ xử lý giao dịch tiền vào
      if (transferType !== "in") {
        console.log("Ignoring outgoing transaction");
        return res.status(200).json({ success: true, message: "Ignored outgoing transaction" });
      }

      // Tìm mã đơn hàng trong nội dung chuyển khoản
      // Format: NAP + timestamp + random (VD: NAPMA4X1ABC)
      const orderIdMatch = content?.match(/NAP[A-Z0-9]+/i) || code?.match(/NAP[A-Z0-9]+/i);
      
      if (!orderIdMatch) {
        console.log("No order ID found in content:", content);
        return res.status(200).json({ success: true, message: "No order ID found" });
      }

      const orderId = orderIdMatch[0].toUpperCase();
      const amount = parseInt(transferAmount);

      console.log(`Processing order: ${orderId}, amount: ${amount}`);

      // Tìm deposit với orderId
      const depositsRef = db.collection("deposits");
      const querySnapshot = await depositsRef
        .where("orderId", "==", orderId)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        console.log("No pending deposit found for:", orderId);
        return res.status(200).json({ success: true, message: "No pending deposit found" });
      }

      const depositDoc = querySnapshot.docs[0];
      const deposit = depositDoc.data();

      // Kiểm tra số tiền (cho phép sai lệch 1000đ do phí)
      if (Math.abs(amount - deposit.amount) > 1000) {
        console.log(`Amount mismatch: received ${amount}, expected ${deposit.amount}`);
        // Vẫn xử lý nhưng log warning
        console.warn("Amount mismatch but processing anyway");
      }

      // Cập nhật deposit status
      await depositDoc.ref.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        actualAmount: amount,
        sepayData: data
      });

      // Cộng tiền cho user
      const userRef = db.collection("users").doc(deposit.userId);
      await userRef.update({
        balance: admin.firestore.FieldValue.increment(amount)
      });

      // Tạo transaction record
      await db.collection("transactions").add({
        userId: deposit.userId,
        type: "deposit",
        amount: amount,
        description: `Nạp tiền tự động - Mã GD: ${orderId}`,
        depositId: depositDoc.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Successfully processed deposit: ${orderId}, amount: ${amount}`);

      return res.status(200).json({ 
        success: true, 
        message: "Deposit processed successfully",
        orderId: orderId,
        amount: amount
      });

    } catch (error) {
      console.error("Webhook error:", error);
      return res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Health check endpoint
 */
exports.health = onRequest(
  { region: "asia-southeast1" },
  (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  }
);

// Product definitions (mirrored from client)
const PRODUCTS = {
  'regfb': {
    name: 'Tool Auto Reg/Very FB LD và Phone',
    plans: {
      'daily': { name: 'Theo ngày', price: 10000, days: 0 },
      'monthly': { name: '1 Tháng', price: 200000, days: 30 },
      'yearly': { name: '1 Năm', price: 500000, days: 365 },
      'lifetime': { name: 'Vĩnh viễn', price: 600000, days: -1 }
    }
  }
};

function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += '-';
  }
  return key;
}

function getExpiryDate(days) {
  if (days <= 0) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Callable function to process license purchase securely
 */
exports.purchaseLicense = onCall(
  { region: "asia-southeast1", cors: true },
  async (request) => {
    // Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Bạn cần đăng nhập để mua hàng.");
    }

    const { productId, planKey } = request.data;
    const uid = request.auth.uid;
    const email = request.auth.token.email || '';

    const product = PRODUCTS[productId] || PRODUCTS['regfb'];
    if (!product) {
      throw new HttpsError("invalid-argument", "Sản phẩm không tồn tại.");
    }

    const plan = product.plans[planKey];
    if (!plan) {
      throw new HttpsError("invalid-argument", "Gói License không tồn tại.");
    }

    const userRef = db.collection('users').doc(uid);

    try {
      // Run the purchase inside a transaction to prevent race conditions
      const result = await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) {
          throw new HttpsError("not-found", "User không tồn tại.");
        }

        const balance = userDoc.data().balance || 0;
        if (balance < plan.price) {
          throw new HttpsError("failed-precondition", "Số dư không đủ! Vui lòng nạp thêm tiền.");
        }

        // Deduct balance
        t.update(userRef, { balance: admin.firestore.FieldValue.increment(-plan.price) });

        const licenseRef = db.collection('licenses').doc();
        const transactionRef = db.collection('transactions').doc();
        
        const licenseKey = generateLicenseKey();
        
        let expiryDate;
        if (planKey === 'daily') {
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 1);
          // Set to end of tomorrow
          expiryDate.setHours(23, 59, 59, 999);
        } else {
          expiryDate = getExpiryDate(plan.days);
        }

        // Add license
        t.set(licenseRef, {
          userId: uid,
          userEmail: email,
          productId: productId || 'regfb',
          licenseKey: licenseKey,
          plan: planKey,
          planName: plan.name,
          price: plan.price,
          status: 'active',
          hwid: null,
          expiresAt: expiryDate ? admin.firestore.Timestamp.fromDate(expiryDate) : null,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Add transaction record
        t.set(transactionRef, {
          userId: uid,
          type: 'license_purchase',
          amount: -plan.price,
          productId: productId || 'regfb',
          description: `Mua ${product.name} - ${plan.name}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
          product: product.name,
          plan: plan.name,
          licenseKey: licenseKey,
          expiresAt: expiryDate ? expiryDate.toISOString() : null
        };
      });

      return { success: true, data: result };

    } catch (error) {
      console.error("Purchase error:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message || "Có lỗi xảy ra khi mua hàng.");
    }
  }
);

exports.renewLicense = onCall({ region: "asia-southeast1", cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bạn cần đăng nhập để thao tác.");
  }

  const { licenseId, renewType, planKey } = request.data;
  const uid = request.auth.uid;

  if (!licenseId || !renewType) {
    throw new HttpsError("invalid-argument", "Thiếu thông tin gia hạn.");
  }

  const userRef = db.collection('users').doc(uid);
  const licenseRef = db.collection('licenses').doc(licenseId);

  try {
    const result = await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef);
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User không tồn tại.");
      }

      const licenseDoc = await t.get(licenseRef);
      if (!licenseDoc.exists) {
        throw new HttpsError("not-found", "License không tồn tại.");
      }

      const licenseData = licenseDoc.data();
      if (licenseData.userId !== uid) {
        throw new HttpsError("permission-denied", "Không có quyền gia hạn license này.");
      }

      const balance = userDoc.data().balance || 0;
      let cost = 0;
      let daysToAdd = 0;
      let planName = '';
      let txType = '';
      let txDesc = '';

      if (renewType === 'daily') {
        cost = 10000;
        daysToAdd = 1;
        planName = 'Gia hạn ngày (10k)';
        txType = 'daily_renewal';
        txDesc = 'Gia hạn gói ngày +1 ngày';
      } else if (renewType === 'standard') {
        // defined in client matching structure
        const RENEWAL_OPTIONS = {
          'regfb': { '1_month': { name: '1 Tháng', price: 200000, days: 30 }, '1_year': { name: '1 Năm', price: 500000, days: 365 } },
          'clonetk': { '1_month': { name: '1 Tháng', price: 300000, days: 30 }, '1_year': { name: '1 Năm', price: 700000, days: 365 } },
          'seoyt': { '1_month': { name: '1 Tháng', price: 400000, days: 30 }, '1_year': { name: '1 Năm', price: 900000, days: 365 } }
        };
        const options = RENEWAL_OPTIONS[licenseData.productId];
        if (!options || !options[planKey]) {
          throw new HttpsError("invalid-argument", "Gói gia hạn không hợp lệ.");
        }
        cost = options[planKey].price;
        daysToAdd = options[planKey].days;
        planName = options[planKey].name;
        txType = 'renewal';
        txDesc = `Gia hạn ${licenseData.productId} - ${planName}`;
      } else {
        throw new HttpsError("invalid-argument", "Loại gia hạn không hợp lệ.");
      }

      if (balance < cost) {
        throw new HttpsError("failed-precondition", `Số dư không đủ! Cần ${cost}đ.`);
      }

      let newExpiryDate;
      const currentExpiry = licenseData.expiresAt?.toDate?.() || new Date(licenseData.expiresAt);
      const now = new Date();

      if (currentExpiry > now) {
        newExpiryDate = new Date(currentExpiry);
      } else {
        newExpiryDate = new Date();
      }
      newExpiryDate.setDate(newExpiryDate.getDate() + daysToAdd);
      
      if (renewType === 'daily') {
        newExpiryDate.setHours(23, 59, 59, 999);
      }

      t.update(userRef, { balance: admin.firestore.FieldValue.increment(-cost) });

      t.update(licenseRef, {
        expiresAt: admin.firestore.Timestamp.fromDate(newExpiryDate),
        status: 'active',
        renewedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const transactionRef = db.collection('transactions').doc();
      t.set(transactionRef, {
        userId: uid,
        userEmail: request.auth.token.email || '',
        type: txType,
        amount: -cost,
        description: txDesc,
        licenseId: licenseId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        newExpiryDate: newExpiryDate.toISOString(),
        cost: cost
      };
    });

    return { success: true, data: result };

  } catch (error) {
    console.error("Renew error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Lỗi gia hạn.");
  }
});
