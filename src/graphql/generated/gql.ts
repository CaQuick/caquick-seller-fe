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
    "\n  query SellerChatsConversations($input: CursorInput) {\n    sellerConversations(input: $input) {\n      items {\n        id\n        accountId\n        buyerNickname\n        lastMessagePreview\n        lastMessageAt\n        sellerLastReadAt\n        unreadCount\n        updatedAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerChatsConversationsDocument,
    "\n  subscription SellerChatsConversationUpdated {\n    sellerConversationUpdated {\n      conversationId\n      accountId\n      buyerNickname\n      lastMessagePreview\n      lastMessageAt\n      sellerLastReadAt\n      unreadCount\n    }\n  }\n": typeof types.SellerChatsConversationUpdatedDocument,
    "\n  query SellerChatsMessages($conversationId: ID!, $input: CursorInput) {\n    sellerConversationMessages(conversationId: $conversationId, input: $input) {\n      items {\n        id\n        conversationId\n        senderType\n        senderAccountId\n        bodyFormat\n        bodyText\n        bodyHtml\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerChatsMessagesDocument,
    "\n  mutation SellerChatsSendMessage($input: SellerSendConversationMessageInput!) {\n    sellerSendConversationMessage(input: $input) {\n      id\n      conversationId\n      senderType\n      senderAccountId\n      bodyFormat\n      bodyText\n      bodyHtml\n      createdAt\n    }\n  }\n": typeof types.SellerChatsSendMessageDocument,
    "\n  mutation SellerChatsMarkRead($conversationId: ID!) {\n    sellerMarkConversationRead(conversationId: $conversationId) {\n      id\n      accountId\n      buyerNickname\n      lastMessagePreview\n      lastMessageAt\n      sellerLastReadAt\n      unreadCount\n      updatedAt\n    }\n  }\n": typeof types.SellerChatsMarkReadDocument,
    "\n  subscription SellerChatsMessageAdded($conversationId: ID!) {\n    conversationMessageAdded(conversationId: $conversationId) {\n      id\n      conversationId\n      senderType\n      bodyFormat\n      bodyText\n      bodyHtml\n      createdAt\n    }\n  }\n": typeof types.SellerChatsMessageAddedDocument,
    "\n  query SellerChatsBuyerOrder($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        buyerName\n        pickupAt\n        firstItemName\n      }\n    }\n  }\n": typeof types.SellerChatsBuyerOrderDocument,
    "\n  query SellerHomeStore {\n    sellerMyStore {\n      id\n      storeName\n      isActive\n    }\n  }\n": typeof types.SellerHomeStoreDocument,
    "\n  query SellerHomeDashboard {\n    sellerDashboard {\n      date\n      newOrderCount\n      pickupDay {\n        salesAmount\n      }\n      createdDay {\n        orderCount\n      }\n      remainingCapacity\n      activeProductCount\n      unansweredConversationCount\n    }\n  }\n": typeof types.SellerHomeDashboardDocument,
    "\n  query SellerHomeRecentOrders($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        status\n        pickupAt\n        buyerName\n        firstItemName\n        firstItemImageUrl\n      }\n    }\n  }\n": typeof types.SellerHomeRecentOrdersDocument,
    "\n  subscription SellerHomeOrderUpdated {\n    sellerOrderUpdated {\n      orderId\n      updatedAt\n    }\n  }\n": typeof types.SellerHomeOrderUpdatedDocument,
    "\n  query SellerOrdersList($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        orderNumber\n        status\n        pickupAt\n        buyerName\n        totalPrice\n        firstItemName\n        firstItemImageUrl\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerOrdersListDocument,
    "\n  query SellerOrderDetail($orderId: ID!) {\n    sellerOrder(orderId: $orderId) {\n      id\n      orderNumber\n      accountId\n      status\n      pickupAt\n      buyerName\n      buyerPhone\n      subtotalPrice\n      discountPrice\n      totalPrice\n      submittedAt\n      confirmedAt\n      madeAt\n      pickedUpAt\n      canceledAt\n      createdAt\n      updatedAt\n      items {\n        id\n        productName\n        quantity\n        optionItems {\n          id\n          groupName\n          optionTitle\n          priceDelta\n        }\n        customTexts {\n          id\n          tokenKey\n          defaultText\n          valueText\n          sortOrder\n        }\n        freeEdits {\n          id\n          cropImageUrl\n          descriptionText\n          sortOrder\n          attachments {\n            id\n            imageUrl\n            sortOrder\n          }\n        }\n      }\n      statusHistories {\n        id\n        toStatus\n        changedAt\n        note\n      }\n    }\n  }\n": typeof types.SellerOrderDetailDocument,
    "\n  mutation SellerUpdateOrderStatus($input: SellerUpdateOrderStatusInput!) {\n    sellerUpdateOrderStatus(input: $input) {\n      id\n      status\n    }\n  }\n": typeof types.SellerUpdateOrderStatusDocument,
    "\n  query SellerOrderConversations($input: CursorInput) {\n    sellerConversations(input: $input) {\n      items {\n        id\n        accountId\n        unreadCount\n      }\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerOrderConversationsDocument,
    "\n  subscription SellerOrdersUpdated {\n    sellerOrderUpdated {\n      orderId\n      status\n      pickupAt\n      buyerName\n      totalPrice\n      productName\n      updatedAt\n    }\n  }\n": typeof types.SellerOrdersUpdatedDocument,
    "\n  query SellerProductsList($input: SellerProductListInput) {\n    sellerProducts(input: $input) {\n      items {\n        id\n        name\n        regularPrice\n        salePrice\n        isActive\n        images {\n          id\n          imageUrl\n        }\n        categories {\n          id\n          name\n        }\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerProductsListDocument,
    "\n  query SellerProductDetail($productId: ID!) {\n    sellerProduct(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      regularPrice\n      salePrice\n      preparationTimeMinutes\n      isActive\n      images {\n        id\n        imageUrl\n        sortOrder\n      }\n      categories {\n        id\n        name\n      }\n      tags {\n        id\n        name\n      }\n      optionGroups {\n        id\n        name\n        isRequired\n        minSelect\n        maxSelect\n        isActive\n        optionItems {\n          id\n        }\n      }\n      customTemplate {\n        id\n        isActive\n        textTokens {\n          id\n        }\n      }\n    }\n  }\n": typeof types.SellerProductDetailDocument,
    "\n  query SellerProductsFilterCategories {\n    categories {\n      id\n      name\n      categoryType\n      sortOrder\n    }\n  }\n": typeof types.SellerProductsFilterCategoriesDocument,
    "\n  query SellerProductBuyerPreview($productId: ID!, $reviews: ProductReviewsInput!) {\n    productDetail(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      images\n      regularPrice\n      salePrice\n      discountRate\n      optionGroups {\n        id\n        name\n        description\n        items {\n          id\n          title\n          description\n          priceDelta\n        }\n      }\n    }\n    productReviews(input: $reviews) {\n      totalCount\n    }\n  }\n": typeof types.SellerProductBuyerPreviewDocument,
    "\n  mutation SellerProductSetActive($input: SellerSetProductActiveInput!) {\n    sellerSetProductActive(input: $input) {\n      id\n      isActive\n    }\n  }\n": typeof types.SellerProductSetActiveDocument,
    "\n  mutation SellerProductDelete($productId: ID!) {\n    sellerDeleteProduct(productId: $productId)\n  }\n": typeof types.SellerProductDeleteDocument,
    "\n  query Ping {\n    ping\n  }\n": typeof types.PingDocument,
};
const documents: Documents = {
    "\n  query SellerAuthMe {\n    sellerMe {\n      accountId\n      username\n      displayName\n      storeId\n      mustChangePassword\n      accountStatus\n    }\n  }\n": types.SellerAuthMeDocument,
    "\n  query SellerChatsConversations($input: CursorInput) {\n    sellerConversations(input: $input) {\n      items {\n        id\n        accountId\n        buyerNickname\n        lastMessagePreview\n        lastMessageAt\n        sellerLastReadAt\n        unreadCount\n        updatedAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerChatsConversationsDocument,
    "\n  subscription SellerChatsConversationUpdated {\n    sellerConversationUpdated {\n      conversationId\n      accountId\n      buyerNickname\n      lastMessagePreview\n      lastMessageAt\n      sellerLastReadAt\n      unreadCount\n    }\n  }\n": types.SellerChatsConversationUpdatedDocument,
    "\n  query SellerChatsMessages($conversationId: ID!, $input: CursorInput) {\n    sellerConversationMessages(conversationId: $conversationId, input: $input) {\n      items {\n        id\n        conversationId\n        senderType\n        senderAccountId\n        bodyFormat\n        bodyText\n        bodyHtml\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerChatsMessagesDocument,
    "\n  mutation SellerChatsSendMessage($input: SellerSendConversationMessageInput!) {\n    sellerSendConversationMessage(input: $input) {\n      id\n      conversationId\n      senderType\n      senderAccountId\n      bodyFormat\n      bodyText\n      bodyHtml\n      createdAt\n    }\n  }\n": types.SellerChatsSendMessageDocument,
    "\n  mutation SellerChatsMarkRead($conversationId: ID!) {\n    sellerMarkConversationRead(conversationId: $conversationId) {\n      id\n      accountId\n      buyerNickname\n      lastMessagePreview\n      lastMessageAt\n      sellerLastReadAt\n      unreadCount\n      updatedAt\n    }\n  }\n": types.SellerChatsMarkReadDocument,
    "\n  subscription SellerChatsMessageAdded($conversationId: ID!) {\n    conversationMessageAdded(conversationId: $conversationId) {\n      id\n      conversationId\n      senderType\n      bodyFormat\n      bodyText\n      bodyHtml\n      createdAt\n    }\n  }\n": types.SellerChatsMessageAddedDocument,
    "\n  query SellerChatsBuyerOrder($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        buyerName\n        pickupAt\n        firstItemName\n      }\n    }\n  }\n": types.SellerChatsBuyerOrderDocument,
    "\n  query SellerHomeStore {\n    sellerMyStore {\n      id\n      storeName\n      isActive\n    }\n  }\n": types.SellerHomeStoreDocument,
    "\n  query SellerHomeDashboard {\n    sellerDashboard {\n      date\n      newOrderCount\n      pickupDay {\n        salesAmount\n      }\n      createdDay {\n        orderCount\n      }\n      remainingCapacity\n      activeProductCount\n      unansweredConversationCount\n    }\n  }\n": types.SellerHomeDashboardDocument,
    "\n  query SellerHomeRecentOrders($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        status\n        pickupAt\n        buyerName\n        firstItemName\n        firstItemImageUrl\n      }\n    }\n  }\n": types.SellerHomeRecentOrdersDocument,
    "\n  subscription SellerHomeOrderUpdated {\n    sellerOrderUpdated {\n      orderId\n      updatedAt\n    }\n  }\n": types.SellerHomeOrderUpdatedDocument,
    "\n  query SellerOrdersList($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        orderNumber\n        status\n        pickupAt\n        buyerName\n        totalPrice\n        firstItemName\n        firstItemImageUrl\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerOrdersListDocument,
    "\n  query SellerOrderDetail($orderId: ID!) {\n    sellerOrder(orderId: $orderId) {\n      id\n      orderNumber\n      accountId\n      status\n      pickupAt\n      buyerName\n      buyerPhone\n      subtotalPrice\n      discountPrice\n      totalPrice\n      submittedAt\n      confirmedAt\n      madeAt\n      pickedUpAt\n      canceledAt\n      createdAt\n      updatedAt\n      items {\n        id\n        productName\n        quantity\n        optionItems {\n          id\n          groupName\n          optionTitle\n          priceDelta\n        }\n        customTexts {\n          id\n          tokenKey\n          defaultText\n          valueText\n          sortOrder\n        }\n        freeEdits {\n          id\n          cropImageUrl\n          descriptionText\n          sortOrder\n          attachments {\n            id\n            imageUrl\n            sortOrder\n          }\n        }\n      }\n      statusHistories {\n        id\n        toStatus\n        changedAt\n        note\n      }\n    }\n  }\n": types.SellerOrderDetailDocument,
    "\n  mutation SellerUpdateOrderStatus($input: SellerUpdateOrderStatusInput!) {\n    sellerUpdateOrderStatus(input: $input) {\n      id\n      status\n    }\n  }\n": types.SellerUpdateOrderStatusDocument,
    "\n  query SellerOrderConversations($input: CursorInput) {\n    sellerConversations(input: $input) {\n      items {\n        id\n        accountId\n        unreadCount\n      }\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerOrderConversationsDocument,
    "\n  subscription SellerOrdersUpdated {\n    sellerOrderUpdated {\n      orderId\n      status\n      pickupAt\n      buyerName\n      totalPrice\n      productName\n      updatedAt\n    }\n  }\n": types.SellerOrdersUpdatedDocument,
    "\n  query SellerProductsList($input: SellerProductListInput) {\n    sellerProducts(input: $input) {\n      items {\n        id\n        name\n        regularPrice\n        salePrice\n        isActive\n        images {\n          id\n          imageUrl\n        }\n        categories {\n          id\n          name\n        }\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerProductsListDocument,
    "\n  query SellerProductDetail($productId: ID!) {\n    sellerProduct(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      regularPrice\n      salePrice\n      preparationTimeMinutes\n      isActive\n      images {\n        id\n        imageUrl\n        sortOrder\n      }\n      categories {\n        id\n        name\n      }\n      tags {\n        id\n        name\n      }\n      optionGroups {\n        id\n        name\n        isRequired\n        minSelect\n        maxSelect\n        isActive\n        optionItems {\n          id\n        }\n      }\n      customTemplate {\n        id\n        isActive\n        textTokens {\n          id\n        }\n      }\n    }\n  }\n": types.SellerProductDetailDocument,
    "\n  query SellerProductsFilterCategories {\n    categories {\n      id\n      name\n      categoryType\n      sortOrder\n    }\n  }\n": types.SellerProductsFilterCategoriesDocument,
    "\n  query SellerProductBuyerPreview($productId: ID!, $reviews: ProductReviewsInput!) {\n    productDetail(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      images\n      regularPrice\n      salePrice\n      discountRate\n      optionGroups {\n        id\n        name\n        description\n        items {\n          id\n          title\n          description\n          priceDelta\n        }\n      }\n    }\n    productReviews(input: $reviews) {\n      totalCount\n    }\n  }\n": types.SellerProductBuyerPreviewDocument,
    "\n  mutation SellerProductSetActive($input: SellerSetProductActiveInput!) {\n    sellerSetProductActive(input: $input) {\n      id\n      isActive\n    }\n  }\n": types.SellerProductSetActiveDocument,
    "\n  mutation SellerProductDelete($productId: ID!) {\n    sellerDeleteProduct(productId: $productId)\n  }\n": types.SellerProductDeleteDocument,
    "\n  query Ping {\n    ping\n  }\n": types.PingDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerAuthMe {\n    sellerMe {\n      accountId\n      username\n      displayName\n      storeId\n      mustChangePassword\n      accountStatus\n    }\n  }\n"): typeof import('./graphql').SellerAuthMeDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerChatsConversations($input: CursorInput) {\n    sellerConversations(input: $input) {\n      items {\n        id\n        accountId\n        buyerNickname\n        lastMessagePreview\n        lastMessageAt\n        sellerLastReadAt\n        unreadCount\n        updatedAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerChatsConversationsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription SellerChatsConversationUpdated {\n    sellerConversationUpdated {\n      conversationId\n      accountId\n      buyerNickname\n      lastMessagePreview\n      lastMessageAt\n      sellerLastReadAt\n      unreadCount\n    }\n  }\n"): typeof import('./graphql').SellerChatsConversationUpdatedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerChatsMessages($conversationId: ID!, $input: CursorInput) {\n    sellerConversationMessages(conversationId: $conversationId, input: $input) {\n      items {\n        id\n        conversationId\n        senderType\n        senderAccountId\n        bodyFormat\n        bodyText\n        bodyHtml\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerChatsMessagesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerChatsSendMessage($input: SellerSendConversationMessageInput!) {\n    sellerSendConversationMessage(input: $input) {\n      id\n      conversationId\n      senderType\n      senderAccountId\n      bodyFormat\n      bodyText\n      bodyHtml\n      createdAt\n    }\n  }\n"): typeof import('./graphql').SellerChatsSendMessageDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerChatsMarkRead($conversationId: ID!) {\n    sellerMarkConversationRead(conversationId: $conversationId) {\n      id\n      accountId\n      buyerNickname\n      lastMessagePreview\n      lastMessageAt\n      sellerLastReadAt\n      unreadCount\n      updatedAt\n    }\n  }\n"): typeof import('./graphql').SellerChatsMarkReadDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription SellerChatsMessageAdded($conversationId: ID!) {\n    conversationMessageAdded(conversationId: $conversationId) {\n      id\n      conversationId\n      senderType\n      bodyFormat\n      bodyText\n      bodyHtml\n      createdAt\n    }\n  }\n"): typeof import('./graphql').SellerChatsMessageAddedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerChatsBuyerOrder($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        buyerName\n        pickupAt\n        firstItemName\n      }\n    }\n  }\n"): typeof import('./graphql').SellerChatsBuyerOrderDocument;
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
export function graphql(source: "\n  query SellerOrdersList($input: SellerOrderListInput) {\n    sellerOrderList(input: $input) {\n      items {\n        id\n        orderNumber\n        status\n        pickupAt\n        buyerName\n        totalPrice\n        firstItemName\n        firstItemImageUrl\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerOrdersListDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerOrderDetail($orderId: ID!) {\n    sellerOrder(orderId: $orderId) {\n      id\n      orderNumber\n      accountId\n      status\n      pickupAt\n      buyerName\n      buyerPhone\n      subtotalPrice\n      discountPrice\n      totalPrice\n      submittedAt\n      confirmedAt\n      madeAt\n      pickedUpAt\n      canceledAt\n      createdAt\n      updatedAt\n      items {\n        id\n        productName\n        quantity\n        optionItems {\n          id\n          groupName\n          optionTitle\n          priceDelta\n        }\n        customTexts {\n          id\n          tokenKey\n          defaultText\n          valueText\n          sortOrder\n        }\n        freeEdits {\n          id\n          cropImageUrl\n          descriptionText\n          sortOrder\n          attachments {\n            id\n            imageUrl\n            sortOrder\n          }\n        }\n      }\n      statusHistories {\n        id\n        toStatus\n        changedAt\n        note\n      }\n    }\n  }\n"): typeof import('./graphql').SellerOrderDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerUpdateOrderStatus($input: SellerUpdateOrderStatusInput!) {\n    sellerUpdateOrderStatus(input: $input) {\n      id\n      status\n    }\n  }\n"): typeof import('./graphql').SellerUpdateOrderStatusDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerOrderConversations($input: CursorInput) {\n    sellerConversations(input: $input) {\n      items {\n        id\n        accountId\n        unreadCount\n      }\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerOrderConversationsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  subscription SellerOrdersUpdated {\n    sellerOrderUpdated {\n      orderId\n      status\n      pickupAt\n      buyerName\n      totalPrice\n      productName\n      updatedAt\n    }\n  }\n"): typeof import('./graphql').SellerOrdersUpdatedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerProductsList($input: SellerProductListInput) {\n    sellerProducts(input: $input) {\n      items {\n        id\n        name\n        regularPrice\n        salePrice\n        isActive\n        images {\n          id\n          imageUrl\n        }\n        categories {\n          id\n          name\n        }\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerProductsListDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerProductDetail($productId: ID!) {\n    sellerProduct(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      regularPrice\n      salePrice\n      preparationTimeMinutes\n      isActive\n      images {\n        id\n        imageUrl\n        sortOrder\n      }\n      categories {\n        id\n        name\n      }\n      tags {\n        id\n        name\n      }\n      optionGroups {\n        id\n        name\n        isRequired\n        minSelect\n        maxSelect\n        isActive\n        optionItems {\n          id\n        }\n      }\n      customTemplate {\n        id\n        isActive\n        textTokens {\n          id\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').SellerProductDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerProductsFilterCategories {\n    categories {\n      id\n      name\n      categoryType\n      sortOrder\n    }\n  }\n"): typeof import('./graphql').SellerProductsFilterCategoriesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerProductBuyerPreview($productId: ID!, $reviews: ProductReviewsInput!) {\n    productDetail(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      images\n      regularPrice\n      salePrice\n      discountRate\n      optionGroups {\n        id\n        name\n        description\n        items {\n          id\n          title\n          description\n          priceDelta\n        }\n      }\n    }\n    productReviews(input: $reviews) {\n      totalCount\n    }\n  }\n"): typeof import('./graphql').SellerProductBuyerPreviewDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerProductSetActive($input: SellerSetProductActiveInput!) {\n    sellerSetProductActive(input: $input) {\n      id\n      isActive\n    }\n  }\n"): typeof import('./graphql').SellerProductSetActiveDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerProductDelete($productId: ID!) {\n    sellerDeleteProduct(productId: $productId)\n  }\n"): typeof import('./graphql').SellerProductDeleteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Ping {\n    ping\n  }\n"): typeof import('./graphql').PingDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
