const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors()); // Allows your HTML frontend to talk to this server
app.use(express.json()); // Allows the server to read the data you send (like total amount)

// 1. Initialize Razorpay with your Test Keys
const razorpay = new Razorpay({
    key_id: 'rzp_test_SJjM5EzjnFRi7Z', // Your actual Key ID
    key_secret: 'IdSmzu5MbEPEALIGZrO5kV8u'    // Your actual Secret Key
});

// 2. Route to Create an Order (Frontend calls this first)
app.post('/create-order', async (req, res) => {
    try {
        const { amount } = req.body; 
        const options = {
            amount: amount * 100, // Razorpay works in paise (₹1 = 100 paise)
            currency: "INR",
            receipt: "order_rcptid_" + Math.floor(Math.random() * 1000)
        };
        
        const order = await razorpay.orders.create(options);
        res.json(order); // Sends the secure Order ID back to your website
    } catch (error) {
        console.error("Order Creation Error:", error);
        res.status(500).send("Unable to create order");
    }
});

// 3. Route to Verify Payment (Frontend calls this after customer pays)
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, customerDetails } = req.body;

    // Mathematical security check to prevent payment spoofing
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", "IdSmzu5MbEPEALIGZrO5kV8u") // FIXED: Using your exact secret key
        .update(sign.toString())
        .digest("hex");

    if (razorpay_signature === expectedSign) {
        // Formats the terminal output beautifully when an order comes in
        console.log("✅ PAYMENT VERIFIED SUCCESSFULLY!");
        console.log("📦 NEW ORDER DETAILS:");
        console.log(`   👤 Name:  ${customerDetails.name}`);
        console.log(`   📱 Phone: ${customerDetails.phone}`);
        console.log(`   ✉️ Email: ${customerDetails.email}`);
        console.log("--------------------------------------------------");
        
        res.json({ success: true, message: "Payment verified successfully" });
    } else {
        console.log("❌ PAYMENT TAMPERED OR INVALID");
        res.status(400).json({ success: false, message: "Invalid signature" });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 CircuitCrafter Backend is active on http://localhost:${PORT}`);
});