/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query SellerAuthMe {\n    sellerMe {\n      accountId\n      username\n      displayName\n      storeId\n      mustChangePassword\n      accountStatus\n    }\n  }\n": typeof types.SellerAuthMeDocument,
    "\n  query SellerHomeStore {\n    sellerMyStore {\n      id\n      storeName\n      isActive\n    }\n  }\n": typeof types.SellerHomeStoreDocument,
    "\n  query SellerHomeDashboard {\n    sellerDashboard {\n      date\n      newOrderCount\n      pickupDay {\n        salesAmount\n      }\n      createdDay {\n        orderCount\n      }\n      remainingCapacity\n      activeProductCount\n      unansweredConversationCount\n    }\n  }\n": typeof types.SellerHomeDashboardDocument,
    "\n  query SellerHomeRecentOrders($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        status\n        pickupAt\n        buyerName\n        firstItemName\n        firstItemImageUrl\n      }\n    }\n  }\n": typeof types.SellerHomeRecentOrdersDocument,
    "\n  subscription SellerHomeOrderUpdated {\n    sellerOrderUpdated {\n      orderId\n      updatedAt\n    }\n  }\n": typeof types.SellerHomeOrderUpdatedDocument,
    "\n  query Ping {\n    ping\n  }\n": typeof types.PingDocument,
};
const documents: Documents = {
    "\n  query SellerAuthMe {\n    sellerMe {\n      accountId\n      username\n      displayName\n      storeId\n      mustChangePassword\n      accountStatus\n    }\n  }\n": types.SellerAuthMeDocument,
    "\n  query SellerHomeStore {\n    sellerMyStore {\n      id\n      storeName\n      isActive\n    }\n  }\n": types.SellerHomeStoreDocument,
    "\n  query SellerHomeDashboard {\n    sellerDashboard {\n      date\n      newOrderCount\n      pickupDay {\n        salesAmount\n      }\n      createdDay {\n        orderCount\n      }\n      remainingCapacity\n      activeProductCount\n      unansweredConversationCount\n    }\n  }\n": types.SellerHomeDashboardDocument,
    "\n  query SellerHomeRecentOrders($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        status\n        pickupAt\n        buyerName\n        firstItemName\n        firstItemImageUrl\n      }\n    }\n  }\n": types.SellerHomeRecentOrdersDocument,
    "\n  subscription SellerHomeOrderUpdated {\n    sellerOrderUpdated {\n      orderId\n      updatedAt\n    }\n  }\n": types.SellerHomeOrderUpdatedDocument,
    "\n  query Ping {\n    ping\n  }\n": types.PingDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerAuthMe {\n    sellerMe {\n      accountId\n      username\n      displayName\n      storeId\n      mustChangePassword\n      accountStatus\n    }\n  }\n"): typeof import('./graphql').SellerAuthMeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerHomeStore {\n    sellerMyStore {\n      id\n      storeName\n      isActive\n    }\n  }\n"): typeof import('./graphql').SellerHomeStoreDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerHomeDashboard {\n    sellerDashboard {\n      date\n      newOrderCount\n      pickupDay {\n        salesAmount\n      }\n      createdDay {\n        orderCount\n      }\n      remainingCapacity\n      activeProductCount\n      unansweredConversationCount\n    }\n  }\n"): typeof import('./graphql').SellerHomeDashboardDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerHomeRecentOrders($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        status\n        pickupAt\n        buyerName\n        firstItemName\n        firstItemImageUrl\n      }\n    }\n  }\n"): typeof import('./graphql').SellerHomeRecentOrdersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription SellerHomeOrderUpdated {\n    sellerOrderUpdated {\n      orderId\n      updatedAt\n    }\n  }\n"): typeof import('./graphql').SellerHomeOrderUpdatedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Ping {\n    ping\n  }\n"): typeof import('./graphql').PingDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
