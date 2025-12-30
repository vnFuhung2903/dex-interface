import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { REGISTRY_ID } from "../constants/config";
import type { Token } from "../types";
import { TOKENS } from "../constants/tokens";

export interface PoolData {
  id: string;
  tokenX: Token | null;
  tokenY: Token | null;
  typeX: string;
  typeY: string;
  reserveX: string;
  reserveY: string;
  lpSupply: string;
  feeBps: number;
  isActive: boolean;
  createdAt: number;
}

interface PoolContent {
  balance_x: string;
  balance_y: string;
  lp_supply: { value: string };
  fee_bps: string;
}

/**
 * Parse coin type from full type string
 * e.g., "0x123::usdc::USDC" -> { symbol: "USDC", address: "0x123::usdc::USDC" }
 */
const parseTypeToToken = (typeString: string): Token | null => {
  // Try to find matching token from our known tokens
  const token = TOKENS.find((t) => t.address === typeString);
  if (token) return token;

  // Parse unknown token
  const parts = typeString.split("::");
  if (parts.length >= 3) {
    return {
      symbol: parts[parts.length - 1],
      name: parts[parts.length - 1],
      decimals: 9, // Default decimals
      address: typeString,
    };
  }

  return null;
};

/**
 * Extract type arguments from Pool type
 * e.g., "0xpkg::pool::Pool<0x2::sui::SUI, 0xpkg::usdc::USDC>"
 * -> ["0x2::sui::SUI", "0xpkg::usdc::USDC"]
 */
const extractPoolTypeArgs = (poolType: string): [string, string] | null => {
  const match = poolType.match(/<(.+),\s*(.+)>/);
  if (match && match[1] && match[2]) {
    return [match[1].trim(), match[2].trim()];
  }
  return null;
};

/**
 * ============================================================
 * WORKSHOP CHALLENGE: Implement this hook!
 * ============================================================
 *
 * This hook should fetch all pools from the registry using dynamic fields.
 *
 * Steps to implement:
 * 1. Get the registry object using client.getObject()
 * 2. Extract the pools table ID from registry fields
 * 3. Get dynamic fields from the pools table using client.getDynamicFields()
 * 4. For each dynamic field, fetch the pool info and actual pool object
 * 5. Parse the pool data and return an array of PoolData
 *
 * Hints:
 * - Use REGISTRY_ID from constants
 * - The registry has a 'pools' field containing a Table
 * - Each pool entry contains pool_id, created_at, is_active
 * - Use extractPoolTypeArgs() and parseTypeToToken() helpers
 *
 * ============================================================
 */
export function usePoolsFromRegistry() {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["poolsFromRegistry", REGISTRY_ID],
    queryFn: async (): Promise<PoolData[]> => {
      // Return an empty array for now
      const registryObj = await client.getObject({
        id: REGISTRY_ID,
        options: { showContent: true, showType: true },
      });

      const parentId = registryObj.data?.content?.fields?.pools?.fields?.id?.id;

      const dynamicObjectFields = await client.getDynamicFields({
        parentId,
      });

      let arr = await Promise.all(
        dynamicObjectFields.data.map(
          async (value: any) =>
            await client.getDynamicFieldObject({
              parentId,
              name: value.name,
            })
        )
      );

      const res = await Promise.all(
        arr.map(async (item: any) => {
          const poolInfoFields = item.data?.content?.fields as {
            name: {
              fields: {
                type_x: { fields: { name: string } };
                type_y: { fields: { name: string } };
              };
            };
            value: {
              fields: {
                pool_id: string;
                created_at: string;
                is_active: boolean;
              };
            };
          };

          const poolObj = await client.getObject({
            id: poolInfoFields.value.fields.pool_id,
            options: { showContent: true, showType: true },
          });

          const itemFields = item.data?.content?.fields;
          let poolType = poolObj.data?.type || "";
          let typeArgs = extractPoolTypeArgs(poolType);
          let typeX = typeArgs?.[0];
          let typeY = typeArgs?.[1];
          return {
            id: itemFields?.value?.fields?.pool_id,
            tokenX: parseTypeToToken(typeX || ""),
            tokenY: parseTypeToToken(typeY || ""),
            typeX: typeX,
            typeY: typeY,
            reserveX: poolObj.data?.content?.fields?.balance_x || "0",
            reserveY: poolObj.data?.content?.fields?.balance_y || "0",
            lpSupply:
              poolObj.data?.content?.fields?.lp_supply?.fields?.value || "0",
            feeBps: poolObj.data?.content?.fields?.fee_bps || "0",
            isActive: itemFields?.value?.fields?.is_active,
            createdAt: parseInt(itemFields?.value?.fields?.created_at || "0"),
          } as PoolData;
        })
      );
      return res;
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });
}

/*
 * ============================================================
 * REFERENCE IMPLEMENTATION (uncomment if you get stuck)
 * ============================================================
 *
 * export function usePoolsFromRegistry() {
 *   const client = useSuiClient();
 *
 *   return useQuery({
 *     queryKey: ['poolsFromRegistry', REGISTRY_ID],
 *     queryFn: async (): Promise<PoolData[]> => {
 *       try {
 *         // Get registry object to check pool_count
 *         const registryObj = await client.getObject({
 *           id: REGISTRY_ID,
 *           options: { showContent: true },
 *         });
 *
 *         if (!registryObj.data?.content || registryObj.data.content.dataType !== 'moveObject') {
 *           console.log('Registry not found or invalid');
 *           return [];
 *         }
 *
 *         const registryFields = registryObj.data.content.fields as {
 *           pool_count: string;
 *           pools: { fields: { id: { id: string } } };
 *         };
 *
 *         const poolCount = parseInt(registryFields.pool_count);
 *         console.log('Pool count from registry:', poolCount);
 *
 *         if (poolCount === 0) {
 *           return [];
 *         }
 *
 *         // Get dynamic fields from the pools table
 *         const tableId = registryFields.pools.fields.id.id;
 *         const dynamicFields = await client.getDynamicFields({
 *           parentId: tableId,
 *         });
 *
 *         console.log('Dynamic fields:', dynamicFields.data);
 *
 *         const pools: PoolData[] = [];
 *
 *         // Fetch each pool info from dynamic fields
 *         for (const field of dynamicFields.data) {
 *           try {
 *             // Get the dynamic field content (PoolInfo)
 *             const fieldObj = await client.getDynamicFieldObject({
 *               parentId: tableId,
 *               name: field.name,
 *             });
 *
 *             if (!fieldObj.data?.content || fieldObj.data.content.dataType !== 'moveObject') {
 *               continue;
 *             }
 *
 *             const poolInfoFields = fieldObj.data.content.fields as {
 *               name: { fields: { type_x: { fields: { name: string } }; type_y: { fields: { name: string } } } };
 *               value: { fields: { pool_id: string; created_at: string; is_active: boolean } };
 *             };
 *
 *             // Pool ID from PoolInfo - handle both string and object formats
 *             const rawPoolId = poolInfoFields.value.fields.pool_id;
 *             // If pool_id is an object with 'id' field, extract it
 *             const poolId = typeof rawPoolId === 'object' && rawPoolId !== null && 'id' in rawPoolId
 *               ? (rawPoolId as { id: string }).id
 *               : rawPoolId as string;
 *
 *             console.log('Registry pool entry:', { rawPoolId, poolId });
 *
 *             // Validate pool ID format (should be 0x followed by 64 hex chars)
 *             const isValidPoolId = typeof poolId === 'string' && /^0x[a-fA-F0-9]{64}$/.test(poolId);
 *             if (!isValidPoolId) {
 *               console.warn('Skipping pool with invalid ID:', poolId);
 *               continue;
 *             }
 *
 *             const createdAt = parseInt(poolInfoFields.value.fields.created_at);
 *             const isActive = poolInfoFields.value.fields.is_active;
 *
 *             // Get the pool key (type names)
 *             const typeX = poolInfoFields.name.fields.type_x.fields.name;
 *             const typeY = poolInfoFields.name.fields.type_y.fields.name;
 *
 *             // Fetch actual pool object to get reserves
 *             const poolObj = await client.getObject({
 *               id: poolId,
 *               options: { showContent: true, showType: true },
 *             });
 *
 *             if (!poolObj.data?.content || poolObj.data.content.dataType !== 'moveObject') {
 *               continue;
 *             }
 *
 *             const poolFields = poolObj.data.content.fields as unknown as PoolContent;
 *             const poolType = poolObj.data.type || '';
 *
 *             // Extract type arguments from pool type
 *             const typeArgs = extractPoolTypeArgs(poolType);
 *             const actualTypeX = typeArgs?.[0] || typeX;
 *             const actualTypeY = typeArgs?.[1] || typeY;
 *
 *             pools.push({
 *               id: poolId,
 *               tokenX: parseTypeToToken(actualTypeX),
 *               tokenY: parseTypeToToken(actualTypeY),
 *               typeX: actualTypeX,
 *               typeY: actualTypeY,
 *               reserveX: poolFields.balance_x || '0',
 *               reserveY: poolFields.balance_y || '0',
 *               lpSupply: poolFields.lp_supply?.value || '0',
 *               feeBps: parseInt(poolFields.fee_bps || '30'),
 *               isActive,
 *               createdAt,
 *             });
 *           } catch (err) {
 *             console.error('Error fetching pool:', err);
 *           }
 *         }
 *
 *         return pools;
 *       } catch (error) {
 *         console.error('Error fetching pools from registry:', error);
 *         return [];
 *       }
 *     },
 *     refetchInterval: 15000,
 *     staleTime: 10000,
 *   });
 * }
 */

/**
 * Hook to get registry pool count
 */
export function useRegistryPoolCount() {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["registryPoolCount", REGISTRY_ID],
    queryFn: async (): Promise<number> => {
      try {
        const registryObj = await client.getObject({
          id: REGISTRY_ID,
          options: { showContent: true, showType: true },
        });

        if (
          !registryObj.data?.content ||
          registryObj.data.content.dataType !== "moveObject"
        ) {
          return 0;
        }

        const fields = registryObj.data.content.fields as {
          pool_count: string;
        };
        return parseInt(fields.pool_count);
      } catch {
        return 0;
      }
    },
    refetchInterval: 10000,
  });
}

/**
 * Hook to fetch a single pool by ID
 */
export function usePoolById(poolId?: string) {
  const client = useSuiClient();

  return useQuery({
    queryKey: ["pool", poolId],
    queryFn: async (): Promise<PoolData | null> => {
      if (!poolId) return null;

      try {
        const poolObj = await client.getObject({
          id: poolId,
          options: { showContent: true, showType: true },
        });

        if (
          !poolObj.data?.content ||
          poolObj.data.content.dataType !== "moveObject"
        ) {
          return null;
        }

        const poolFields = poolObj.data.content
          .fields as unknown as PoolContent;
        const poolType = poolObj.data.type || "";

        const typeArgs = extractPoolTypeArgs(poolType);
        if (!typeArgs) return null;

        const [typeX, typeY] = typeArgs;

        return {
          id: poolId,
          tokenX: parseTypeToToken(typeX),
          tokenY: parseTypeToToken(typeY),
          typeX,
          typeY,
          reserveX: poolFields.balance_x || "0",
          reserveY: poolFields.balance_y || "0",
          lpSupply: poolFields.lp_supply?.value || "0",
          feeBps: parseInt(poolFields.fee_bps || "30"),
          isActive: true,
          createdAt: 0,
        };
      } catch (error) {
        console.error("Error fetching pool:", error);
        return null;
      }
    },
    enabled: !!poolId,
    refetchInterval: 10000,
  });
}
