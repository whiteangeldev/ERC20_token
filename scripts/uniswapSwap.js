require("dotenv").config();
const { ethers } = require("ethers");
const readline = require("readline");

// Uniswap V2 router address for Sepolia (verify if needed)
const UNISWAP_ROUTER_ADDRESS = "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921";
// Uniswap V2 router ABI (only needed functions)
const UNISWAP_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function ask(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Get token addresses
  const tokenIn =
    process.env.TOKEN_IN || (await ask("Enter input token address: "));
  const tokenOut =
    process.env.TOKEN_OUT || (await ask("Enter output token address: "));
  const amountIn = ethers.parseUnits(
    process.env.AMOUNT_IN || (await ask("Amount of input token to swap: ")),
    18
  );

  const tokenInContract = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
  const router = new ethers.Contract(
    UNISWAP_ROUTER_ADDRESS,
    UNISWAP_ROUTER_ABI,
    wallet
  );

  // Approve router to spend input token
  let allowance = await tokenInContract.allowance(
    wallet.address,
    UNISWAP_ROUTER_ADDRESS
  );
  if (allowance < amountIn) {
    const tx = await tokenInContract.approve(UNISWAP_ROUTER_ADDRESS, amountIn);
    await tx.wait();
    console.log("Approved input token");
  }

  // Swap
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
  const path = [tokenIn, tokenOut];
  const amountOutMin = 0; // WARNING: Set to 0 for demo; in production, calculate minimum expected
  const tx = await router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    path,
    wallet.address,
    deadline
  );
  const receipt = await tx.wait();
  console.log("Swap complete! Tx hash:", receipt.hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
