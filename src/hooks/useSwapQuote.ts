import { useQuery } from "@tanstack/react-query";
import type { Token, SwapQuote } from "../types";
import { getPoolByTokens } from "../constants";

const SWAP_FEE = 0.003; // 0.3%

/**
 * ============================================================
 * WORKSHOP CHALLENGE: Implement these helper functions!
 * ============================================================
 *
 * calculateOutputAmount:
 * - Uses constant product formula: (x + dx) * (y - dy) = x * y
 * - With fee: dy = y * dx * (1 - fee) / (x + dx * (1 - fee))
 *
 * calculatePriceImpact:
 * - Compare spot price vs actual execution price
 * - Return percentage difference
 *
 * ============================================================
 */

function calculateOutputAmount(
  inputAmount: string,
  reserveIn: string,
  reserveOut: string
): string {
  // Hint: dy = y * dx * (1 - fee) / (x + dx * (1 - fee))
  console.log(inputAmount, reserveIn, reserveOut);
  const x = Number(reserveIn);
  const y = Number(reserveOut);
  const dx = Number(inputAmount);
  return ((y * dx * (1 - SWAP_FEE)) / (x + dx * (1 - SWAP_FEE))).toString();
}

function calculatePriceImpact(
  inputAmount: string,
  outputAmount: string,
  reserveIn: string,
  reserveOut: string
): number {
  // Hint: Compare spot price (reserveOut/reserveIn) with actual price (outputAmount/inputAmount)
  const spotPrice = Number(reserveOut) / Number(reserveIn);
  const actualPrice = Number(outputAmount) / Number(inputAmount);
  const impact = ((spotPrice - actualPrice) / spotPrice) * 100;
  return impact;
}

/*
 * ============================================================
 * REFERENCE IMPLEMENTATION (uncomment if you get stuck)
 * ============================================================
 *
 * function calculateOutputAmount(
 *   inputAmount: string,
 *   reserveIn: string,
 *   reserveOut: string
 * ): string {
 *   const amountIn = parseFloat(inputAmount);
 *   const resIn = parseFloat(reserveIn);
 *   const resOut = parseFloat(reserveOut);
 *
 *   if (amountIn <= 0 || resIn <= 0 || resOut <= 0) return '0';
 *
 *   // Constant product formula: (x + dx) * (y - dy) = x * y
 *   // With fee: dy = y * dx * (1 - fee) / (x + dx * (1 - fee))
 *   const amountInWithFee = amountIn * (1 - SWAP_FEE);
 *   const outputAmount = (resOut * amountInWithFee) / (resIn + amountInWithFee);
 *
 *   return outputAmount.toFixed(8);
 * }
 *
 * function calculatePriceImpact(
 *   inputAmount: string,
 *   outputAmount: string,
 *   reserveIn: string,
 *   reserveOut: string
 * ): number {
 *   const resIn = parseFloat(reserveIn);
 *   const resOut = parseFloat(reserveOut);
 *   const spotPrice = resOut / resIn;
 *
 *   const actualPrice = parseFloat(outputAmount) / parseFloat(inputAmount);
 *   const impact = ((spotPrice - actualPrice) / spotPrice) * 100;
 *
 *   return Math.max(0, impact);
 * }
 */

/**
 * ============================================================
 * WORKSHOP CHALLENGE: Implement this hook!
 * ============================================================
 *
 * This hook should calculate swap quotes for token exchanges.
 *
 * Steps to implement:
 * 1. Find the pool for the given token pair using getPoolByTokens()
 * 2. Determine which token is input/output in the pool
 * 3. Scale input amount to token decimals
 * 4. Calculate output amount using the AMM formula
 * 5. Calculate price impact and fee
 * 6. Return the SwapQuote object
 *
 * ============================================================
 */
export function useSwapQuote(
  inputToken?: Token,
  outputToken?: Token,
  inputAmount?: string
) {
  return useQuery({
    queryKey: [
      "swapQuote",
      inputToken?.address,
      outputToken?.address,
      inputAmount,
    ],
    queryFn: async (): Promise<SwapQuote | null> => {
      if (
        !inputToken ||
        !outputToken ||
        !inputAmount ||
        parseFloat(inputAmount) <= 0
      ) {
        return null;
      }

      // You'll need to:
      // 1. Get the pool using getPoolByTokens(inputToken.address, outputToken.address)
      // 2. Calculate output using calculateOutputAmount()
      // 3. Calculate price impact using calculatePriceImpact()

      const pool = getPoolByTokens(inputToken.address, outputToken.address);
      if (!pool) {
        console.log(
          "No pool found for",
          inputToken.symbol,
          "/",
          outputToken.symbol
        );
        return null;
      }

      // Placeholder: call the helper functions so workshop attendees know they exist
      const reserveIn =
        pool.tokenA.address === inputToken.address
          ? pool.reserveA
          : pool.reserveB;
      const reserveOut =
        pool.tokenA.address === inputToken.address
          ? pool.reserveB
          : pool.reserveA;
      const outputAmount = calculateOutputAmount(
        inputAmount,
        reserveIn,
        reserveOut
      );
      const priceImpact = calculatePriceImpact(
        inputAmount,
        outputAmount,
        reserveIn,
        reserveOut
      );

      // Return null until implemented
      return {
         inputToken,
         outputToken,
         inputAmount,
         outputAmount,
         priceImpact,
         fee: (Number(inputAmount) * SWAP_FEE).toString(),
         route: [inputToken.symbol, outputToken.symbol],
       };
    },
    enabled:
      !!inputToken &&
      !!outputToken &&
      !!inputAmount &&
      parseFloat(inputAmount) > 0,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

/*
 * ============================================================
 * REFERENCE IMPLEMENTATION (uncomment if you get stuck)
 * ============================================================
 *
 * export function useSwapQuote(
 *   inputToken?: Token,
 *   outputToken?: Token,
 *   inputAmount?: string
 * ) {
 *   return useQuery({
 *     queryKey: ['swapQuote', inputToken?.address, outputToken?.address, inputAmount],
 *     queryFn: async (): Promise<SwapQuote | null> => {
 *       if (!inputToken || !outputToken || !inputAmount || parseFloat(inputAmount) <= 0) {
 *         return null;
 *       }
 *
 *       const pool = getPoolByTokens(inputToken.address, outputToken.address);
 *       if (!pool) return null;
 *
 *       // Determine which token is which in the pool
 *       const isTokenAInput = pool.tokenA.address === inputToken.address;
 *       const reserveIn = isTokenAInput ? pool.reserveA : pool.reserveB;
 *       const reserveOut = isTokenAInput ? pool.reserveB : pool.reserveA;
 *
 *       // Scale input amount to token decimals
 *       const scaledInput = (parseFloat(inputAmount) * Math.pow(10, inputToken.decimals)).toString();
 *
 *       const outputAmount = calculateOutputAmount(scaledInput, reserveIn, reserveOut);
 *
 *       // Scale output back to display decimals
 *       const displayOutput = (parseFloat(outputAmount) / Math.pow(10, outputToken.decimals)).toFixed(6);
 *
 *       const priceImpact = calculatePriceImpact(scaledInput, outputAmount, reserveIn, reserveOut);
 *       const fee = (parseFloat(inputAmount) * SWAP_FEE).toFixed(6);
 *
 *       return {
 *         inputToken,
 *         outputToken,
 *         inputAmount,
 *         outputAmount: displayOutput,
 *         priceImpact,
 *         fee,
 *         route: [inputToken.symbol, outputToken.symbol],
 *       };
 *     },
 *     enabled: !!inputToken && !!outputToken && !!inputAmount && parseFloat(inputAmount) > 0,
 *     refetchInterval: 5000,
 *     staleTime: 2000,
 *   });
 * }
 */

/**
 * ============================================================
 * WORKSHOP CHALLENGE: Implement this hook!
 * ============================================================
 *
 * This hook should fetch the exchange rate between two tokens.
 *
 * Steps to implement:
 * 1. Find the pool for the given token pair
 * 2. Calculate the rate based on reserves
 * 3. Account for decimal differences between tokens
 *
 * ============================================================
 */
export function useSwapRate(tokenA?: Token, tokenB?: Token) {
  return useQuery({
    queryKey: ["swapRate", tokenA?.address, tokenB?.address],
    queryFn: async () => {
      if (!tokenA || !tokenB) return null;

      const pool = getPoolByTokens(tokenA.address, tokenB.address);
      if (!pool) return null;
      const reserveA =
        pool.tokenA.address === tokenA.address ? pool.reserveA : pool.reserveB;
      const reserveB =
        pool.tokenA.address === tokenA.address ? pool.reserveB : pool.reserveA;

      const decimalDiff = tokenB.decimals - tokenA.decimals;
      const rate =
        (Number(reserveB) / Number(reserveA)) * Math.pow(10, decimalDiff);

      return {
        rate,
        formatted: `1 ${tokenA.symbol} = ${rate.toFixed(4)} ${tokenB.symbol}`,
      };
    },
    enabled: !!tokenA && !!tokenB,
    refetchInterval: 10000,
  });
}

/*
 * ============================================================
 * REFERENCE IMPLEMENTATION (uncomment if you get stuck)
 * ============================================================
 *
 * export function useSwapRate(tokenA?: Token, tokenB?: Token) {
 *   return useQuery({
 *     queryKey: ['swapRate', tokenA?.address, tokenB?.address],
 *     queryFn: async () => {
 *       if (!tokenA || !tokenB) return null;
 *
 *       const pool = getPoolByTokens(tokenA.address, tokenB.address);
 *       if (!pool) return null;
 *
 *       const isTokenAFirst = pool.tokenA.address === tokenA.address;
 *       const reserveA = parseFloat(isTokenAFirst ? pool.reserveA : pool.reserveB);
 *       const reserveB = parseFloat(isTokenAFirst ? pool.reserveB : pool.reserveA);
 *
 *       const decimalDiff = tokenB.decimals - tokenA.decimals;
 *       const rate = (reserveB / reserveA) * Math.pow(10, decimalDiff);
 *
 *       return {
 *         rate,
 *         formatted: `1 ${tokenA.symbol} = ${rate.toFixed(4)} ${tokenB.symbol}`,
 *       };
 *     },
 *     enabled: !!tokenA && !!tokenB,
 *     refetchInterval: 10000,
 *   });
 * }
 */
