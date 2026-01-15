/**
 * Sepay Webhook Handler for Firebase Cloud Functions
 * Nhận webhook từ Sepay khi có giao dịch ngân hàng
 * Tự động cộng tiền vào tài khoản user
 */

const { onRequest } = require("firebase-functions/v2/https");
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
