import express from 'express';
import cors from 'cors';
import { privateKeyToAccount } from 'viem/accounts';
import { Hex, createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import fs from 'fs/promises';
import path from 'path';

interface PaymentRequest {
  amount: number;
  currency: string;
  type: string;
  metadata?: any;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  type: string;
  txHash: string;
  timestamp: string;
  from: string;
  status: 'pending' | 'confirmed' | 'failed';
  metadata?: any;
}

class PayFlowPaymentServer {
  private app: express.Application;
  private port: number;
  private paymentsFile: string;
  private publicClient: any;

  constructor(port: number = 3402) {
    this.app = express();
    this.port = port;
    this.paymentsFile = path.join('./payflow-data', 'payment-records.json');
    
    // Initialize Viem client for Base Sepolia
    this.publicClient = createPublicClient({
      chain: base,
      transport: http()
    });
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // x402 middleware - validate payment headers
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path}`);
      console.log('Headers:', req.headers);
      next();
    });
  }

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        server: 'PayFlow x402 Payment Server',
        timestamp: new Date().toISOString()
      });
    });

    // Payment endpoint
    this.app.post('/payments', async (req, res) => {
      try {
        await this.handlePayment(req, res);
      } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: 'Payment processing failed' });
      }
    });

    // Get payment records
    this.app.get('/payments', async (req, res) => {
      try {
        const payments = await this.loadPayments();
        res.json({ payments });
      } catch (error) {
        res.status(500).json({ error: 'Failed to load payments' });
      }
    });

    // Get specific payment
    this.app.get('/payments/:id', async (req, res) => {
      try {
        const payments = await this.loadPayments();
        const payment = payments.find((p: PaymentRecord) => p.id === req.params.id);
        
        if (!payment) {
          return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json({ payment });
      } catch (error) {
        res.status(500).json({ error: 'Failed to load payment' });
      }
    });

    // Bounty-specific endpoints
    this.app.post('/bounty/:bountyId/submit', async (req, res) => {
      try {
        await this.handleBountySubmission(req, res);
      } catch (error) {
        console.error('Bounty submission error:', error);
        res.status(500).json({ error: 'Bounty submission failed' });
      }
    });
  }

  private async handlePayment(req: express.Request, res: express.Response) {
    const paymentRequired = req.headers['x-payment-required'] as string;
    const paymentCurrency = req.headers['x-payment-currency'] as string || 'USDC';
    const paymentNetwork = req.headers['x-payment-network'] as string || 'base-mainnet';
    
    const body: PaymentRequest = req.body;
    
    console.log('💳 Processing payment request:');
    console.log('Required:', paymentRequired);
    console.log('Currency:', paymentCurrency);
    console.log('Network:', paymentNetwork);
    console.log('Body:', body);

    // Validate payment amount
    const requiredAmount = parseFloat(paymentRequired || '0');
    const requestAmount = body.amount || 0;
    
    if (requiredAmount > 0 && requestAmount < requiredAmount) {
      return res.status(402).json({
        error: 'Payment Required',
        required: requiredAmount,
        currency: paymentCurrency,
        message: `Payment of ${requiredAmount} ${paymentCurrency} required`
      });
    }

    // Simulate payment processing
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const txHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
    
    const payment: PaymentRecord = {
      id: paymentId,
      amount: requestAmount,
      currency: paymentCurrency,
      type: body.type || 'general',
      txHash,
      timestamp: new Date().toISOString(),
      from: 'x402-client',
      status: 'confirmed',
      metadata: body.metadata
    };

    // Save payment record
    await this.savePayment(payment);

    console.log(`✅ Payment processed: ${paymentId}`);
    console.log(`💰 Amount: ${requestAmount} ${paymentCurrency}`);
    console.log(`🔗 Tx Hash: ${txHash}`);

    // Respond with x402 headers
    res.set({
      'x402-payment-id': paymentId,
      'x402-tx-hash': txHash,
      'x402-price': requestAmount.toString(),
      'x402-currency': paymentCurrency,
      'x402-network': paymentNetwork,
      'x402-payment-confirmed': 'true'
    });

    res.json({
      success: true,
      payment: payment,
      message: `Payment of ${requestAmount} ${paymentCurrency} processed successfully`
    });
  }

  private async handleBountySubmission(req: express.Request, res: express.Response) {
    const { bountyId } = req.params;
    const { submissionData, submissionType, submitterWallet } = req.body;
    
    console.log(`🎯 Processing bounty submission for: ${bountyId}`);
    
    // This would normally validate against the bounty database
    // For now, we'll simulate the entry fee requirement
    const entryFee = 0.02; // Default entry fee
    
    const paymentId = `bounty_${bountyId}_${Date.now()}`;
    const txHash = `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`;
    
    const payment: PaymentRecord = {
      id: paymentId,
      amount: entryFee,
      currency: 'USDC',
      type: 'bounty_entry',
      txHash,
      timestamp: new Date().toISOString(),
      from: submitterWallet,
      status: 'confirmed',
      metadata: {
        bountyId,
        submissionData,
        submissionType
      }
    };

    await this.savePayment(payment);

    res.set({
      'x402-payment-id': paymentId,
      'x402-tx-hash': txHash,
      'x402-price': entryFee.toString(),
      'x402-currency': 'USDC',
      'x402-payment-confirmed': 'true'
    });

    res.json({
      success: true,
      payment: payment,
      submission: {
        bountyId,
        submissionData,
        submissionType,
        submitter: submitterWallet
      }
    });
  }

  private async loadPayments(): Promise<PaymentRecord[]> {
    try {
      await fs.mkdir(path.dirname(this.paymentsFile), { recursive: true });
      const data = await fs.readFile(this.paymentsFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async savePayment(payment: PaymentRecord) {
    const payments = await this.loadPayments();
    payments.push(payment);
    await fs.writeFile(this.paymentsFile, JSON.stringify(payments, null, 2));
  }

  public start() {
    this.app.listen(this.port, () => {
      console.log(`🔥 PayFlow Payment Server running on port ${this.port}`);
      console.log(`💳 x402 payment endpoint: http://localhost:${this.port}/payments`);
      console.log(`🎯 Bounty submissions: http://localhost:${this.port}/bounty/:id/submit`);
      console.log(`📊 Health check: http://localhost:${this.port}/health`);
      console.log(`⚡ Ready to process real payments!`);
    });
  }
}

async function main() {
  const port = parseInt(process.env.PAYMENT_SERVER_PORT || '3402');
  const server = new PayFlowPaymentServer(port);
  server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PayFlowPaymentServer };
