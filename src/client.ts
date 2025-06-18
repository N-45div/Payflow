import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from 'node:readline/promises';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

class PayFlowMCPClient {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private tools: MCPTool[] = [];

  constructor() {
    // Initialize MCP client
    this.mcp = new Client({ 
      name: "payflow-mcp-client", 
      version: "1.0.0" 
    }, {
      capabilities: {
        tools: {}
      }
    });
  }

  async connectToServer(serverScriptPath: string) {
    /**
     * Connect to PayFlow MCP server
     *
     * @param serverScriptPath - Path to the server script
     */
    try {
      console.log(`🚀 Connecting to PayFlow server: ${serverScriptPath}`);
      
      // Initialize transport for Node.js script
      this.transport = new StdioClientTransport({
        command: process.execPath, // node
        args: [serverScriptPath],
      });
      
      await this.mcp.connect(this.transport);
      console.log("✅ Connected to PayFlow MCP server");

      // List available tools
      console.log("📡 Fetching available tools...");
      const toolsResult = await this.mcp.listTools();
      
      this.tools = toolsResult.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
      
      console.log("✅ Available PayFlow tools:");
      this.tools.forEach((tool, i) => {
        console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
      });
      
    } catch (error) {
      console.error("❌ Failed to connect to PayFlow MCP server:", error);
      throw error;
    }
  }

  async callTool(toolName: string, args: any = {}) {
    /**
     * Call a PayFlow tool directly
     *
     * @param toolName - Name of the tool to call
     * @param args - Arguments for the tool
     * @returns Tool execution result
     */
    try {
      console.log(`⚡ Calling tool: ${toolName}`);
      console.log(`📋 Arguments:`, JSON.stringify(args, null, 2));
      
      const result = await this.mcp.callTool({
        name: toolName,
        arguments: args,
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Tool call failed for ${toolName}:`, error);
      throw error;
    }
  }

  displayResult(result: any) {
    console.log("\n✅ Result:");
    console.log("=".repeat(50));
    
    if (result.content) {
      result.content.forEach((item: any) => {
        if (item.type === 'text' && item.text) {
          console.log(item.text);
        } else {
          console.log(JSON.stringify(item, null, 2));
        }
      });
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    
    console.log("=".repeat(50));
  }

  async interactiveLoop() {
    /**
     * Run an interactive PayFlow session
     */
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\n🎯 PayFlow MCP Client Started!");
      console.log("Available commands:");
      console.log("  - list: Show all tools");
      console.log("  - call <tool_name>: Call a tool interactively");
      console.log("  - quick: Run quick tests");
      console.log("  - demo: Run full demo");
      console.log("  - quit: Exit");

      while (true) {
        const command = await rl.question("\n💰 PayFlow> ");
        
        if (command.toLowerCase() === "quit") {
          break;
        }
        
        await this.handleCommand(command, rl);
      }
    } finally {
      rl.close();
    }
  }

  async handleCommand(command: string, rl: readline.Interface) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];

    try {
      switch (cmd) {
        case 'list':
          this.listTools();
          break;
          
        case 'call':
          if (arg) {
            await this.callToolInteractively(arg, rl);
          } else {
            console.log("Usage: call <tool_name>");
          }
          break;
          
        case 'quick':
          await this.runQuickTests();
          break;
          
        case 'demo':
          await this.runFullDemo(rl);
          break;
          
        default:
          console.log("Unknown command. Type 'list', 'call <tool>', 'quick', 'demo', or 'quit'");
      }
    } catch (error) {
      console.error("❌ Command failed:", error);
    }
  }

  listTools() {
    console.log("\n📦 Available PayFlow Tools:");
    this.tools.forEach((tool, i) => {
      console.log(`\n${i + 1}. 🔧 ${tool.name}`);
      console.log(`   📝 ${tool.description}`);
      if (tool.inputSchema?.properties) {
        const params = Object.keys(tool.inputSchema.properties);
        console.log(`   📋 Parameters: ${params.join(', ')}`);
      }
    });
  }

  async runQuickTests() {
    console.log("\n🧪 Running PayFlow Quick Tests...");
    
    // Test 1: Wallet details
    try {
      console.log("\n1. Testing wallet details...");
      const walletResult = await this.callTool("get_wallet_details");
      console.log("✅ Wallet test passed");
    } catch (error : any) {
      console.log("⚠️ Wallet test failed:", error.message);
    }
    
    // Test 2: Analytics
    try {
      console.log("\n2. Testing analytics...");
      const analyticsResult = await this.callTool("view_payflow_analytics", { timeframe: "all" });
      console.log("✅ Analytics test passed");
    } catch (error : any) {
      console.log("⚠️ Analytics test failed:", error.message);
    }
    
    console.log("\n🎯 Quick tests completed!");
  }

  async runFullDemo(rl: readline.Interface) {
    console.log("\n🎯 PayFlow Full Demo");
    console.log("=".repeat(25));
    
    const choice = await rl.question(`
What would you like to create?
1. 🎯 Bounty board
2. 🔧 Micropayment service  
3. 💸 Revenue split
4. 📡 Paid API call

Enter choice (1-4): `);

    switch (choice.trim()) {
      case '1':
        await this.demoBountyBoard(rl);
        break;
      case '2':
        await this.demoMicropaymentService(rl);
        break;
      case '3':
        await this.demoRevenueSplit(rl);
        break;
      case '4':
        await this.demoPaidAPI(rl);
        break;
      default:
        console.log("Invalid choice");
    }
  }

  async demoBountyBoard(rl: readline.Interface) {
    console.log("\n🎯 CREATE BOUNTY BOARD");
    console.log("=".repeat(25));
    
    const bountyTitle = await rl.question("Bounty title: ");
    const bountyAmount = parseFloat(await rl.question("Prize amount (USDC): "));
    const entryFee = parseFloat(await rl.question("Entry fee per submission (USDC): "));
    const maxSubmissions = parseInt(await rl.question("Maximum submissions [10]: ") || "10");
    const evaluationCriteria = await rl.question("How will you judge submissions: ");
    const days = parseInt(await rl.question("Days until deadline [7]: ") || "7");
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    
    try {
      const result = await this.callTool("setup_bounty_board", {
        bountyTitle,
        bountyAmount,
        entryFee,
        maxSubmissions,
        evaluationCriteria,
        submissionDeadline: deadline.toISOString()
      });
      
      this.displayResult(result);
    } catch (error) {
      console.error("❌ Bounty creation failed:", error);
    }
  }

  async demoMicropaymentService(rl: readline.Interface) {
    console.log("\n🔧 CREATE MICROPAYMENT SERVICE");
    console.log("=".repeat(30));
    
    const serviceName = await rl.question("Service name: ");
    const pricePerUse = parseFloat(await rl.question("Price per use (USDC): "));
    
    console.log("\nService types: ai-query, data-analysis, api-access, content-generation, file-processing, custom");
    const serviceType = await rl.question("Service type [api-access]: ") || "api-access";
    const serviceURL = await rl.question("Service URL (optional): ");
    const affiliatePercentage = parseFloat(await rl.question("Affiliate percentage [10]: ") || "10");
    
    try {
      const result = await this.callTool("create_micropayment_service", {
        serviceName,
        pricePerUse,
        serviceType,
        serviceURL,
        affiliatePercentage
      });
      
      this.displayResult(result);
    } catch (error) {
      console.error("❌ Service creation failed:", error);
    }
  }

  async demoRevenueSplit(rl: readline.Interface) {
    console.log("\n💸 EXECUTE REVENUE SPLIT");
    console.log("=".repeat(25));
    
    const totalAmount = parseFloat(await rl.question("Total amount to split (USDC): "));
    const numRecipients = parseInt(await rl.question("Number of recipients: "));
    
    const recipients = [];
    let remainingPercentage = 100;
    
    for (let i = 0; i < numRecipients; i++) {
      console.log(`\nRecipient ${i + 1}:`);
      const address = await rl.question("  Wallet address: ");
      const label = await rl.question("  Label: ");
      
      let percentage;
      if (i === numRecipients - 1) {
        percentage = remainingPercentage;
        console.log(`  Percentage: ${percentage}% (remaining)`);
      } else {
        percentage = parseFloat(await rl.question(`  Percentage (${remainingPercentage}% remaining): `));
        remainingPercentage -= percentage;
      }
      
      recipients.push({ address, percentage, label });
    }
    
    try {
      const result = await this.callTool("revenue_split_payment", {
        totalAmount,
        recipients
      });
      
      this.displayResult(result);
    } catch (error) {
      console.error("❌ Revenue split failed:", error);
    }
  }

  async demoPaidAPI(rl: readline.Interface) {
    console.log("\n📡 PAID API CALL");
    console.log("=".repeat(20));
    
    const url = await rl.question("API URL [https://httpbin.org/json]: ") || "https://httpbin.org/json";
    const method = await rl.question("Method [GET]: ") || "GET";
    
    try {
      const result = await this.callTool("call_paid_api", {
        url,
        method
      });
      
      this.displayResult(result);
    } catch (error) {
      console.error("❌ API call failed:", error);
    }
  }

  async callToolInteractively(toolName: string, rl: readline.Interface) {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      console.log(`❌ Tool '${toolName}' not found`);
      return;
    }

    console.log(`\n🔧 Calling: ${tool.name}`);
    console.log(`📝 ${tool.description}`);

    const args: any = {};
    
    if (tool.inputSchema?.properties) {
      for (const [param, schema] of Object.entries(tool.inputSchema.properties)) {
        const isRequired = tool.inputSchema.required?.includes(param);
        const schemaObj = schema as any;
        const prompt = `${param}${isRequired ? ' (required)' : ' (optional)'} [${schemaObj.type}]: `;
        
        const value = await rl.question(prompt);
        
        if (value) {
          if (schemaObj.type === 'number') {
            args[param] = parseFloat(value);
          } else if (schemaObj.type === 'array') {
            // Simple array parsing
            args[param] = value.split(',').map(s => s.trim());
          } else {
            args[param] = value;
          }
        }
      }
    }

    try {
      const result = await this.callTool(toolName, args);
      this.displayResult(result);
    } catch (error) {
      console.error("❌ Tool execution failed:", error);
    }
  }

  async cleanup() {
    /**
     * Clean up resources
     */
    if (this.mcp) {
      await this.mcp.close();
    }
  }
}

async function main() {
  const serverPath = process.argv[2] || "build/index.js";
  
  console.log("🎯 PayFlow MCP Client");
  console.log("=====================");
  console.log(`Server: ${serverPath}`);
  
  const mcpClient = new PayFlowMCPClient();
  
  try {
    await mcpClient.connectToServer(serverPath);
    await mcpClient.interactiveLoop();
  } catch (error) {
    console.error("❌ Client failed:", error);
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PayFlowMCPClient };
