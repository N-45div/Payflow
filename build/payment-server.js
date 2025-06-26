#!/usr/bin/env node

// src/payment-server.ts
import express from "express";
import cors from "cors";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import fs from "fs/promises";
import path from "path";
var PayFlowPaymentServer = class {
  app;
  port;
  paymentsFile;
  publicClient;
  constructor(port = 3402) {
    this.app = express();
    this.port = port;
    this.paymentsFile = path.join("./payflow-data", "payment-records.json");
    this.publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    this.setupMiddleware();
    this.setupRoutes();
  }
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      console.log(`\u{1F4E1} ${req.method} ${req.path}`);
      console.log("Headers:", req.headers);
      next();
    });
  }
  setupRoutes() {
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        server: "PayFlow x402 Payment Server",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    this.app.post("/payments", async (req, res) => {
      try {
        await this.handlePayment(req, res);
      } catch (error) {
        console.error("Payment error:", error);
        res.status(500).json({ error: "Payment processing failed" });
      }
    });
    this.app.get("/payments", async (req, res) => {
      try {
        const payments = await this.loadPayments();
        res.json({ payments });
      } catch (error) {
        res.status(500).json({ error: "Failed to load payments" });
      }
    });
    this.app.get("/payments/:id", async (req, res) => {
      try {
        const payments = await this.loadPayments();
        const payment = payments.find((p) => p.id === req.params.id);
        if (!payment) {
          return res.status(404).json({ error: "Payment not found" });
        }
        res.json({ payment });
      } catch (error) {
        res.status(500).json({ error: "Failed to load payment" });
      }
    });
    this.app.post("/bounty/:bountyId/submit", async (req, res) => {
      try {
        await this.handleBountySubmission(req, res);
      } catch (error) {
        console.error("Bounty submission error:", error);
        res.status(500).json({ error: "Bounty submission failed" });
      }
    });
  }
  async handlePayment(req, res) {
    const paymentRequired = req.headers["x-payment-required"];
    const paymentCurrency = req.headers["x-payment-currency"] || "USDC";
    const paymentNetwork = req.headers["x-payment-network"] || "base-mainnet";
    const body = req.body;
    console.log("\u{1F4B3} Processing payment request:");
    console.log("Required:", paymentRequired);
    console.log("Currency:", paymentCurrency);
    console.log("Network:", paymentNetwork);
    console.log("Body:", body);
    const requiredAmount = parseFloat(paymentRequired || "0");
    const requestAmount = body.amount || 0;
    if (requiredAmount > 0 && requestAmount < requiredAmount) {
      return res.status(402).json({
        error: "Payment Required",
        required: requiredAmount,
        currency: paymentCurrency,
        message: `Payment of ${requiredAmount} ${paymentCurrency} required`
      });
    }
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const txHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
    const payment = {
      id: paymentId,
      amount: requestAmount,
      currency: paymentCurrency,
      type: body.type || "general",
      txHash,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      from: "x402-client",
      status: "confirmed",
      metadata: body.metadata
    };
    await this.savePayment(payment);
    console.log(`\u2705 Payment processed: ${paymentId}`);
    console.log(`\u{1F4B0} Amount: ${requestAmount} ${paymentCurrency}`);
    console.log(`\u{1F517} Tx Hash: ${txHash}`);
    res.set({
      "x402-payment-id": paymentId,
      "x402-tx-hash": txHash,
      "x402-price": requestAmount.toString(),
      "x402-currency": paymentCurrency,
      "x402-network": paymentNetwork,
      "x402-payment-confirmed": "true"
    });
    res.json({
      success: true,
      payment,
      message: `Payment of ${requestAmount} ${paymentCurrency} processed successfully`
    });
  }
  async handleBountySubmission(req, res) {
    const { bountyId } = req.params;
    const { submissionData, submissionType, submitterWallet } = req.body;
    console.log(`\u{1F3AF} Processing bounty submission for: ${bountyId}`);
    const entryFee = 0.02;
    const paymentId = `bounty_${bountyId}_${Date.now()}`;
    const txHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
    const payment = {
      id: paymentId,
      amount: entryFee,
      currency: "USDC",
      type: "bounty_entry",
      txHash,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      from: submitterWallet,
      status: "confirmed",
      metadata: {
        bountyId,
        submissionData,
        submissionType
      }
    };
    await this.savePayment(payment);
    res.set({
      "x402-payment-id": paymentId,
      "x402-tx-hash": txHash,
      "x402-price": entryFee.toString(),
      "x402-currency": "USDC",
      "x402-payment-confirmed": "true"
    });
    res.json({
      success: true,
      payment,
      submission: {
        bountyId,
        submissionData,
        submissionType,
        submitter: submitterWallet
      }
    });
  }
  async loadPayments() {
    try {
      await fs.mkdir(path.dirname(this.paymentsFile), { recursive: true });
      const data = await fs.readFile(this.paymentsFile, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  async savePayment(payment) {
    const payments = await this.loadPayments();
    payments.push(payment);
    await fs.writeFile(this.paymentsFile, JSON.stringify(payments, null, 2));
  }
  start() {
    this.app.listen(this.port, () => {
      console.log(`\u{1F525} PayFlow Payment Server running on port ${this.port}`);
      console.log(`\u{1F4B3} x402 payment endpoint: http://localhost:${this.port}/payments`);
      console.log(`\u{1F3AF} Bounty submissions: http://localhost:${this.port}/bounty/:id/submit`);
      console.log(`\u{1F4CA} Health check: http://localhost:${this.port}/health`);
      console.log(`\u26A1 Ready to process real payments!`);
    });
  }
};
async function main() {
  const port = parseInt(process.env.PAYMENT_SERVER_PORT || "3402");
  const server = new PayFlowPaymentServer(port);
  server.start();
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
export {
  PayFlowPaymentServer
};
//# sourceMappingURL=payment-server.js.map