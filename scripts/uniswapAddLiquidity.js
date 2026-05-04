require("dotenv").config();
const { ethers } = require("ethers");
const readline = require("readline");

// Uniswap V2 router address for Sepolia (verify if needed)
const UNISWAP_ROUTER_ADDRESS = "0x2D99ABD9008Dc933ff5c0CD271B88309593aB921";
// Uniswap V2 router ABI (only needed functions)
const UNISWAP_ROUTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)",
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
  const tokenA = process.env.TOKEN_A || (await ask("Enter TokenA address: "));
  const tokenB = process.env.TOKEN_B || (await ask("Enter TokenB address: "));

  // Amounts to add
  const amountA = ethers.parseUnits(
    process.env.AMOUNT_A || (await ask("Amount of TokenA to add: ")),
    18
  );
  const amountB = ethers.parseUnits(
    process.env.AMOUNT_B || (await ask("Amount of TokenB to add: ")),
    18
  );

  const tokenAContract = new ethers.Contract(tokenA, ERC20_ABI, wallet);
  const tokenBContract = new ethers.Contract(tokenB, ERC20_ABI, wallet);
  const router = new ethers.Contract(
    UNISWAP_ROUTER_ADDRESS,
    UNISWAP_ROUTER_ABI,
    wallet
  );

  // Approve router to spend tokens
  let allowanceA = await tokenAContract.allowance(
    wallet.address,
    UNISWAP_ROUTER_ADDRESS
  );
  if (allowanceA < amountA) {
    const tx = await tokenAContract.approve(UNISWAP_ROUTER_ADDRESS, amountA);
    await tx.wait();
    console.log("Approved TokenA");
  }
  let allowanceB = await tokenBContract.allowance(
    wallet.address,
    UNISWAP_ROUTER_ADDRESS
  );
  if (allowanceB < amountB) {
    const tx = await tokenBContract.approve(UNISWAP_ROUTER_ADDRESS, amountB);
    await tx.wait();
    console.log("Approved TokenB");
  }

  // Add liquidity
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now
  const tx = await router.addLiquidity(
    tokenA,
    tokenB,
    amountA,
    amountB,
    0, // amountAMin
    0, // amountBMin
    wallet.address,
    deadline
  );
  const receipt = await tx.wait();
  console.log("Liquidity added! Tx hash:", receipt.hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
