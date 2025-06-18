#!/usr/bin/env node

// src/client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as readline from "readline/promises";
var PayFlowMCPClient = class {
  mcp;
  transport = null;
  tools = [];
  constructor() {
    this.mcp = new Client({
      name: "payflow-mcp-client",
      version: "1.0.0"
    }, {
      capabilities: {
        tools: {}
      }
    });
  }
  async connectToServer(serverScriptPath) {
    try {
      console.log(`\u{1F680} Connecting to PayFlow server: ${serverScriptPath}`);
      this.transport = new StdioClientTransport({
        command: process.execPath,
        // node
        args: [serverScriptPath]
      });
      await this.mcp.connect(this.transport);
      console.log("\u2705 Connected to PayFlow MCP server");
      console.log("\u{1F4E1} Fetching available tools...");
      const toolsResult = await this.mcp.listTools();
      this.tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
      console.log("\u2705 Available PayFlow tools:");
      this.tools.forEach((tool, i) => {
        console.log(`  ${i + 1}. ${tool.name} - ${tool.description}`);
      });
    } catch (error) {
      console.error("\u274C Failed to connect to PayFlow MCP server:", error);
      throw error;
    }
  }
  async callTool(toolName, args = {}) {
    try {
      console.log(`\u26A1 Calling tool: ${toolName}`);
      console.log(`\u{1F4CB} Arguments:`, JSON.stringify(args, null, 2));
      const result = await this.mcp.callTool({
        name: toolName,
        arguments: args
      });
      return result;
    } catch (error) {
      console.error(`\u274C Tool call failed for ${toolName}:`, error);
      throw error;
    }
  }
  displayResult(result) {
    console.log("\n\u2705 Result:");
    console.log("=".repeat(50));
    if (result.content) {
      result.content.forEach((item) => {
        if (item.type === "text" && item.text) {
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
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    try {
      console.log("\n\u{1F3AF} PayFlow MCP Client Started!");
      console.log("Available commands:");
      console.log("  - list: Show all tools");
      console.log("  - call <tool_name>: Call a tool interactively");
      console.log("  - quick: Run quick tests");
      console.log("  - demo: Run full demo");
      console.log("  - quit: Exit");
      while (true) {
        const command = await rl.question("\n\u{1F4B0} PayFlow> ");
        if (command.toLowerCase() === "quit") {
          break;
        }
        await this.handleCommand(command, rl);
      }
    } finally {
      rl.close();
    }
  }
  async handleCommand(command, rl) {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];
    try {
      switch (cmd) {
        case "list":
          this.listTools();
          break;
        case "call":
          if (arg) {
            await this.callToolInteractively(arg, rl);
          } else {
            console.log("Usage: call <tool_name>");
          }
          break;
        case "quick":
          await this.runQuickTests();
          break;
        case "demo":
          await this.runFullDemo(rl);
          break;
        default:
          console.log("Unknown command. Type 'list', 'call <tool>', 'quick', 'demo', or 'quit'");
      }
    } catch (error) {
      console.error("\u274C Command failed:", error);
    }
  }
  listTools() {
    console.log("\n\u{1F4E6} Available PayFlow Tools:");
    this.tools.forEach((tool, i) => {
      console.log(`
${i + 1}. \u{1F527} ${tool.name}`);
      console.log(`   \u{1F4DD} ${tool.description}`);
      if (tool.inputSchema?.properties) {
        const params = Object.keys(tool.inputSchema.properties);
        console.log(`   \u{1F4CB} Parameters: ${params.join(", ")}`);
      }
    });
  }
  async runQuickTests() {
    console.log("\n\u{1F9EA} Running PayFlow Quick Tests...");
    try {
      console.log("\n1. Testing wallet details...");
      const walletResult = await this.callTool("get_wallet_details");
      console.log("\u2705 Wallet test passed");
    } catch (error) {
      console.log("\u26A0\uFE0F Wallet test failed:", error.message);
    }
    try {
      console.log("\n2. Testing analytics...");
      const analyticsResult = await this.callTool("view_payflow_analytics", { timeframe: "all" });
      console.log("\u2705 Analytics test passed");
    } catch (error) {
      console.log("\u26A0\uFE0F Analytics test failed:", error.message);
    }
    console.log("\n\u{1F3AF} Quick tests completed!");
  }
  async runFullDemo(rl) {
    console.log("\n\u{1F3AF} PayFlow Full Demo");
    console.log("=".repeat(25));
    const choice = await rl.question(`
What would you like to create?
1. \u{1F3AF} Bounty board
2. \u{1F527} Micropayment service  
3. \u{1F4B8} Revenue split
4. \u{1F4E1} Paid API call

Enter choice (1-4): `);
    switch (choice.trim()) {
      case "1":
        await this.demoBountyBoard(rl);
        break;
      case "2":
        await this.demoMicropaymentService(rl);
        break;
      case "3":
        await this.demoRevenueSplit(rl);
        break;
      case "4":
        await this.demoPaidAPI(rl);
        break;
      default:
        console.log("Invalid choice");
    }
  }
  async demoBountyBoard(rl) {
    console.log("\n\u{1F3AF} CREATE BOUNTY BOARD");
    console.log("=".repeat(25));
    const bountyTitle = await rl.question("Bounty title: ");
    const bountyAmount = parseFloat(await rl.question("Prize amount (USDC): "));
    const entryFee = parseFloat(await rl.question("Entry fee per submission (USDC): "));
    const maxSubmissions = parseInt(await rl.question("Maximum submissions [10]: ") || "10");
    const evaluationCriteria = await rl.question("How will you judge submissions: ");
    const days = parseInt(await rl.question("Days until deadline [7]: ") || "7");
    const deadline = /* @__PURE__ */ new Date();
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
      console.error("\u274C Bounty creation failed:", error);
    }
  }
  async demoMicropaymentService(rl) {
    console.log("\n\u{1F527} CREATE MICROPAYMENT SERVICE");
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
      console.error("\u274C Service creation failed:", error);
    }
  }
  async demoRevenueSplit(rl) {
    console.log("\n\u{1F4B8} EXECUTE REVENUE SPLIT");
    console.log("=".repeat(25));
    const totalAmount = parseFloat(await rl.question("Total amount to split (USDC): "));
    const numRecipients = parseInt(await rl.question("Number of recipients: "));
    const recipients = [];
    let remainingPercentage = 100;
    for (let i = 0; i < numRecipients; i++) {
      console.log(`
Recipient ${i + 1}:`);
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
      console.error("\u274C Revenue split failed:", error);
    }
  }
  async demoPaidAPI(rl) {
    console.log("\n\u{1F4E1} PAID API CALL");
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
      console.error("\u274C API call failed:", error);
    }
  }
  async callToolInteractively(toolName, rl) {
    const tool = this.tools.find((t) => t.name === toolName);
    if (!tool) {
      console.log(`\u274C Tool '${toolName}' not found`);
      return;
    }
    console.log(`
\u{1F527} Calling: ${tool.name}`);
    console.log(`\u{1F4DD} ${tool.description}`);
    const args = {};
    if (tool.inputSchema?.properties) {
      for (const [param, schema] of Object.entries(tool.inputSchema.properties)) {
        const isRequired = tool.inputSchema.required?.includes(param);
        const schemaObj = schema;
        const prompt = `${param}${isRequired ? " (required)" : " (optional)"} [${schemaObj.type}]: `;
        const value = await rl.question(prompt);
        if (value) {
          if (schemaObj.type === "number") {
            args[param] = parseFloat(value);
          } else if (schemaObj.type === "array") {
            args[param] = value.split(",").map((s) => s.trim());
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
      console.error("\u274C Tool execution failed:", error);
    }
  }
  async cleanup() {
    if (this.mcp) {
      await this.mcp.close();
    }
  }
};
async function main() {
  const serverPath = process.argv[2] || "build/index.js";
  console.log("\u{1F3AF} PayFlow MCP Client");
  console.log("=====================");
  console.log(`Server: ${serverPath}`);
  const mcpClient = new PayFlowMCPClient();
  try {
    await mcpClient.connectToServer(serverPath);
    await mcpClient.interactiveLoop();
  } catch (error) {
    console.error("\u274C Client failed:", error);
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
export {
  PayFlowMCPClient
};
//# sourceMappingURL=client.js.map