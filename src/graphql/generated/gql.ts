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
    "\n  mutation SellerProductCreate($input: SellerCreateProductInput!) {\n    sellerCreateProduct(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerProductCreateDocument,
    "\n  mutation SellerProductAddImage($input: SellerAddProductImageInput!) {\n    sellerAddProductImage(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerProductAddImageDocument,
    "\n  mutation SellerProductSetCategories($input: SellerSetProductCategoriesInput!) {\n    sellerSetProductCategories(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerProductSetCategoriesDocument,
    "\n  mutation SellerProductSetTags($input: SellerSetProductTagsByNameInput!) {\n    sellerSetProductTagsByName(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerProductSetTagsDocument,
    "\n  mutation SellerProductCreateOptionGroup($input: SellerCreateOptionGroupInput!) {\n    sellerCreateOptionGroup(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerProductCreateOptionGroupDocument,
    "\n  mutation SellerProductCreateOptionItem($input: SellerCreateOptionItemInput!) {\n    sellerCreateOptionItem(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerProductCreateOptionItemDocument,
    "\n  query SellerProductTagSearch($input: SellerTagSearchInput!) {\n    sellerSearchTags(input: $input) {\n      id\n      name\n      isExactMatch\n      productCount\n    }\n  }\n": typeof types.SellerProductTagSearchDocument,
    "\n  mutation SellerPushRegisterToken($input: SellerRegisterPushTokenInput!) {\n    sellerRegisterPushToken(input: $input)\n  }\n": typeof types.SellerPushRegisterTokenDocument,
    "\n  mutation SellerPushUnregisterToken($input: SellerUnregisterPushTokenInput!) {\n    sellerUnregisterPushToken(input: $input)\n  }\n": typeof types.SellerPushUnregisterTokenDocument,
    "\n  fragment SellerReviewMediaFields on ReviewMedia {\n    mediaType\n    mediaUrl\n    thumbnailUrl\n    sortOrder\n  }\n": typeof types.SellerReviewMediaFieldsFragmentDoc,
    "\n  query SellerReviewsList($input: StoreReviewsInput!) {\n    storeReviews(input: $input) {\n      items {\n        id\n        rating\n        content\n        media {\n          ...SellerReviewMediaFields\n        }\n        likeCount\n        authorNickname\n        productName\n        createdAt\n      }\n      totalCount\n      photoTotalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerReviewsListDocument,
    "\n  query SellerReviewsDetail($reviewId: ID!) {\n    reviewDetail(reviewId: $reviewId) {\n      review {\n        id\n        rating\n        content\n        media {\n          ...SellerReviewMediaFields\n        }\n        likeCount\n        commentCount\n        authorNickname\n        customOptions {\n          groupName\n          optionTitle\n        }\n        createdAt\n      }\n      product {\n        productId\n        name\n        thumbnailUrl\n        regularPrice\n        salePrice\n      }\n    }\n  }\n": typeof types.SellerReviewsDetailDocument,
    "\n  query SellerReviewsComments($input: ReviewCommentsInput!) {\n    reviewComments(input: $input) {\n      items {\n        id\n        content\n        authorNickname\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerReviewsCommentsDocument,
    "\n  query SellerSettingsStore {\n    sellerMyStore {\n      id\n      storeName\n    }\n  }\n": typeof types.SellerSettingsStoreDocument,
    "\n  query SellerStoreAuditLogs($input: SellerAuditLogListInput) {\n    sellerAuditLogs(input: $input) {\n      items {\n        id\n        targetType\n        targetId\n        action\n        beforeJson\n        afterJson\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerStoreAuditLogsDocument,
    "\n  mutation SellerStoreCreateFaqTopic($input: SellerCreateFaqTopicInput!) {\n    sellerCreateFaqTopic(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerStoreCreateFaqTopicDocument,
    "\n  mutation SellerStoreUpdateFaqTopic($input: SellerUpdateFaqTopicInput!) {\n    sellerUpdateFaqTopic(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerStoreUpdateFaqTopicDocument,
    "\n  mutation SellerStoreDeleteFaqTopic($topicId: ID!) {\n    sellerDeleteFaqTopic(topicId: $topicId)\n  }\n": typeof types.SellerStoreDeleteFaqTopicDocument,
    "\n  fragment SellerStoreFields on SellerStore {\n    id\n    storeName\n    storePhone\n    addressFull\n    addressCity\n    addressDistrict\n    addressNeighborhood\n    mapProvider\n    websiteUrl\n    businessHoursText\n    profileImageUrl\n    greetingMessage\n    pickupSlotIntervalMinutes\n    minLeadTimeMinutes\n    maxDaysAhead\n    isActive\n  }\n": typeof types.SellerStoreFieldsFragmentDoc,
    "\n  query SellerStoreMyStore {\n    sellerMyStore {\n      ...SellerStoreFields\n    }\n  }\n": typeof types.SellerStoreMyStoreDocument,
    "\n  query SellerStoreRating($storeId: ID!) {\n    storeDetail(storeId: $storeId) {\n      id\n      ratingAverage\n      reviewCount\n    }\n  }\n": typeof types.SellerStoreRatingDocument,
    "\n  mutation SellerStoreUpdateBasicInfo($input: SellerUpdateStoreBasicInfoInput!) {\n    sellerUpdateStoreBasicInfo(input: $input) {\n      ...SellerStoreFields\n    }\n  }\n": typeof types.SellerStoreUpdateBasicInfoDocument,
    "\n  mutation SellerStoreUpdatePickupPolicy($input: SellerUpdatePickupPolicyInput!) {\n    sellerUpdatePickupPolicy(input: $input) {\n      ...SellerStoreFields\n    }\n  }\n": typeof types.SellerStoreUpdatePickupPolicyDocument,
    "\n  mutation SellerStoreCreateUploadUrl($input: SellerCreateUploadUrlInput!) {\n    sellerCreateUploadUrl(input: $input) {\n      uploadUrl\n      publicUrl\n    }\n  }\n": typeof types.SellerStoreCreateUploadUrlDocument,
    "\n  query SellerStoreFaqTopics {\n    sellerFaqTopics {\n      id\n      storeId\n      title\n      answerHtml\n      sortOrder\n      isActive\n      createdAt\n      updatedAt\n    }\n  }\n": typeof types.SellerStoreFaqTopicsDocument,
    "\n  query SellerStorePreviewDetail($storeId: ID!) {\n    storeDetail(storeId: $storeId) {\n      id\n      storeName\n      regionLabel\n      ratingAverage\n      reviewCount\n      images\n    }\n    storeProductCategories(storeId: $storeId) {\n      id\n      name\n      sortOrder\n      productCount\n    }\n  }\n": typeof types.SellerStorePreviewDetailDocument,
    "\n  query SellerStorePreviewProducts($input: StoreProductsInput!) {\n    storeProducts(input: $input) {\n      items {\n        product {\n          id\n          name\n          thumbnailUrl\n          regularPrice\n          salePrice\n          discountRate\n        }\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerStorePreviewProductsDocument,
    "\n  query SellerStorePreviewProduct($productId: ID!) {\n    productDetail(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      images\n      regularPrice\n      salePrice\n      discountRate\n    }\n  }\n": typeof types.SellerStorePreviewProductDocument,
    "\n  query SellerStoreRegionGroups {\n    regionGroups {\n      id\n      name\n      hasChildren\n    }\n  }\n": typeof types.SellerStoreRegionGroupsDocument,
    "\n  query SellerStoreRegions($parentId: ID!) {\n    regions(parentId: $parentId) {\n      id\n      name\n    }\n  }\n": typeof types.SellerStoreRegionsDocument,
    "\n  query SellerStoreSearchRegions($input: SearchRegionsInput!) {\n    searchRegions(input: $input) {\n      id\n      name\n      parentName\n      level\n    }\n  }\n": typeof types.SellerStoreSearchRegionsDocument,
    "\n  query SellerStoreBusinessHours {\n    sellerStoreBusinessHours {\n      id\n      dayOfWeek\n      isClosed\n      openTime\n      closeTime\n    }\n  }\n": typeof types.SellerStoreBusinessHoursDocument,
    "\n  mutation SellerStoreUpsertBusinessHour($input: SellerUpsertStoreBusinessHourInput!) {\n    sellerUpsertStoreBusinessHour(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerStoreUpsertBusinessHourDocument,
    "\n  query SellerStoreSpecialClosures($input: CursorInput) {\n    sellerStoreSpecialClosures(input: $input) {\n      items {\n        id\n        closureDate\n        reason\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": typeof types.SellerStoreSpecialClosuresDocument,
    "\n  mutation SellerStoreUpsertSpecialClosure($input: SellerUpsertStoreSpecialClosureInput!) {\n    sellerUpsertStoreSpecialClosure(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerStoreUpsertSpecialClosureDocument,
    "\n  mutation SellerStoreDeleteSpecialClosure($closureId: ID!) {\n    sellerDeleteStoreSpecialClosure(closureId: $closureId)\n  }\n": typeof types.SellerStoreDeleteSpecialClosureDocument,
    "\n  query SellerStoreDailyCapacities($input: SellerDateCursorInput) {\n    sellerStoreDailyCapacities(input: $input) {\n      items {\n        id\n        capacityDate\n        capacity\n      }\n      totalCount\n    }\n  }\n": typeof types.SellerStoreDailyCapacitiesDocument,
    "\n  mutation SellerStoreUpsertDailyCapacity($input: SellerUpsertStoreDailyCapacityInput!) {\n    sellerUpsertStoreDailyCapacity(input: $input) {\n      id\n    }\n  }\n": typeof types.SellerStoreUpsertDailyCapacityDocument,
    "\n  mutation SellerStoreDeleteDailyCapacity($capacityId: ID!) {\n    sellerDeleteStoreDailyCapacity(capacityId: $capacityId)\n  }\n": typeof types.SellerStoreDeleteDailyCapacityDocument,
    "\n  query SellerStorePickupCalendar($storeId: ID!, $yearMonth: String!) {\n    pickupCalendar(storeId: $storeId, yearMonth: $yearMonth) {\n      yearMonth\n      days {\n        date\n        selectable\n        reason\n      }\n    }\n  }\n": typeof types.SellerStorePickupCalendarDocument,
    "\n  query SellerStorePickupTimeSlots($storeId: ID!, $date: String!) {\n    pickupTimeSlots(storeId: $storeId, date: $date) {\n      date\n      morning {\n        time\n        available\n      }\n      afternoon {\n        time\n        available\n      }\n    }\n  }\n": typeof types.SellerStorePickupTimeSlotsDocument,
    "\n  mutation SellerUploadsCreateUploadUrl($input: SellerCreateUploadUrlInput!) {\n    sellerCreateUploadUrl(input: $input) {\n      uploadUrl\n      publicUrl\n    }\n  }\n": typeof types.SellerUploadsCreateUploadUrlDocument,
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
    "\n  mutation SellerProductCreate($input: SellerCreateProductInput!) {\n    sellerCreateProduct(input: $input) {\n      id\n    }\n  }\n": types.SellerProductCreateDocument,
    "\n  mutation SellerProductAddImage($input: SellerAddProductImageInput!) {\n    sellerAddProductImage(input: $input) {\n      id\n    }\n  }\n": types.SellerProductAddImageDocument,
    "\n  mutation SellerProductSetCategories($input: SellerSetProductCategoriesInput!) {\n    sellerSetProductCategories(input: $input) {\n      id\n    }\n  }\n": types.SellerProductSetCategoriesDocument,
    "\n  mutation SellerProductSetTags($input: SellerSetProductTagsByNameInput!) {\n    sellerSetProductTagsByName(input: $input) {\n      id\n    }\n  }\n": types.SellerProductSetTagsDocument,
    "\n  mutation SellerProductCreateOptionGroup($input: SellerCreateOptionGroupInput!) {\n    sellerCreateOptionGroup(input: $input) {\n      id\n    }\n  }\n": types.SellerProductCreateOptionGroupDocument,
    "\n  mutation SellerProductCreateOptionItem($input: SellerCreateOptionItemInput!) {\n    sellerCreateOptionItem(input: $input) {\n      id\n    }\n  }\n": types.SellerProductCreateOptionItemDocument,
    "\n  query SellerProductTagSearch($input: SellerTagSearchInput!) {\n    sellerSearchTags(input: $input) {\n      id\n      name\n      isExactMatch\n      productCount\n    }\n  }\n": types.SellerProductTagSearchDocument,
    "\n  mutation SellerPushRegisterToken($input: SellerRegisterPushTokenInput!) {\n    sellerRegisterPushToken(input: $input)\n  }\n": types.SellerPushRegisterTokenDocument,
    "\n  mutation SellerPushUnregisterToken($input: SellerUnregisterPushTokenInput!) {\n    sellerUnregisterPushToken(input: $input)\n  }\n": types.SellerPushUnregisterTokenDocument,
    "\n  fragment SellerReviewMediaFields on ReviewMedia {\n    mediaType\n    mediaUrl\n    thumbnailUrl\n    sortOrder\n  }\n": types.SellerReviewMediaFieldsFragmentDoc,
    "\n  query SellerReviewsList($input: StoreReviewsInput!) {\n    storeReviews(input: $input) {\n      items {\n        id\n        rating\n        content\n        media {\n          ...SellerReviewMediaFields\n        }\n        likeCount\n        authorNickname\n        productName\n        createdAt\n      }\n      totalCount\n      photoTotalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerReviewsListDocument,
    "\n  query SellerReviewsDetail($reviewId: ID!) {\n    reviewDetail(reviewId: $reviewId) {\n      review {\n        id\n        rating\n        content\n        media {\n          ...SellerReviewMediaFields\n        }\n        likeCount\n        commentCount\n        authorNickname\n        customOptions {\n          groupName\n          optionTitle\n        }\n        createdAt\n      }\n      product {\n        productId\n        name\n        thumbnailUrl\n        regularPrice\n        salePrice\n      }\n    }\n  }\n": types.SellerReviewsDetailDocument,
    "\n  query SellerReviewsComments($input: ReviewCommentsInput!) {\n    reviewComments(input: $input) {\n      items {\n        id\n        content\n        authorNickname\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerReviewsCommentsDocument,
    "\n  query SellerSettingsStore {\n    sellerMyStore {\n      id\n      storeName\n    }\n  }\n": types.SellerSettingsStoreDocument,
    "\n  query SellerStoreAuditLogs($input: SellerAuditLogListInput) {\n    sellerAuditLogs(input: $input) {\n      items {\n        id\n        targetType\n        targetId\n        action\n        beforeJson\n        afterJson\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerStoreAuditLogsDocument,
    "\n  mutation SellerStoreCreateFaqTopic($input: SellerCreateFaqTopicInput!) {\n    sellerCreateFaqTopic(input: $input) {\n      id\n    }\n  }\n": types.SellerStoreCreateFaqTopicDocument,
    "\n  mutation SellerStoreUpdateFaqTopic($input: SellerUpdateFaqTopicInput!) {\n    sellerUpdateFaqTopic(input: $input) {\n      id\n    }\n  }\n": types.SellerStoreUpdateFaqTopicDocument,
    "\n  mutation SellerStoreDeleteFaqTopic($topicId: ID!) {\n    sellerDeleteFaqTopic(topicId: $topicId)\n  }\n": types.SellerStoreDeleteFaqTopicDocument,
    "\n  fragment SellerStoreFields on SellerStore {\n    id\n    storeName\n    storePhone\n    addressFull\n    addressCity\n    addressDistrict\n    addressNeighborhood\n    mapProvider\n    websiteUrl\n    businessHoursText\n    profileImageUrl\n    greetingMessage\n    pickupSlotIntervalMinutes\n    minLeadTimeMinutes\n    maxDaysAhead\n    isActive\n  }\n": types.SellerStoreFieldsFragmentDoc,
    "\n  query SellerStoreMyStore {\n    sellerMyStore {\n      ...SellerStoreFields\n    }\n  }\n": types.SellerStoreMyStoreDocument,
    "\n  query SellerStoreRating($storeId: ID!) {\n    storeDetail(storeId: $storeId) {\n      id\n      ratingAverage\n      reviewCount\n    }\n  }\n": types.SellerStoreRatingDocument,
    "\n  mutation SellerStoreUpdateBasicInfo($input: SellerUpdateStoreBasicInfoInput!) {\n    sellerUpdateStoreBasicInfo(input: $input) {\n      ...SellerStoreFields\n    }\n  }\n": types.SellerStoreUpdateBasicInfoDocument,
    "\n  mutation SellerStoreUpdatePickupPolicy($input: SellerUpdatePickupPolicyInput!) {\n    sellerUpdatePickupPolicy(input: $input) {\n      ...SellerStoreFields\n    }\n  }\n": types.SellerStoreUpdatePickupPolicyDocument,
    "\n  mutation SellerStoreCreateUploadUrl($input: SellerCreateUploadUrlInput!) {\n    sellerCreateUploadUrl(input: $input) {\n      uploadUrl\n      publicUrl\n    }\n  }\n": types.SellerStoreCreateUploadUrlDocument,
    "\n  query SellerStoreFaqTopics {\n    sellerFaqTopics {\n      id\n      storeId\n      title\n      answerHtml\n      sortOrder\n      isActive\n      createdAt\n      updatedAt\n    }\n  }\n": types.SellerStoreFaqTopicsDocument,
    "\n  query SellerStorePreviewDetail($storeId: ID!) {\n    storeDetail(storeId: $storeId) {\n      id\n      storeName\n      regionLabel\n      ratingAverage\n      reviewCount\n      images\n    }\n    storeProductCategories(storeId: $storeId) {\n      id\n      name\n      sortOrder\n      productCount\n    }\n  }\n": types.SellerStorePreviewDetailDocument,
    "\n  query SellerStorePreviewProducts($input: StoreProductsInput!) {\n    storeProducts(input: $input) {\n      items {\n        product {\n          id\n          name\n          thumbnailUrl\n          regularPrice\n          salePrice\n          discountRate\n        }\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerStorePreviewProductsDocument,
    "\n  query SellerStorePreviewProduct($productId: ID!) {\n    productDetail(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      images\n      regularPrice\n      salePrice\n      discountRate\n    }\n  }\n": types.SellerStorePreviewProductDocument,
    "\n  query SellerStoreRegionGroups {\n    regionGroups {\n      id\n      name\n      hasChildren\n    }\n  }\n": types.SellerStoreRegionGroupsDocument,
    "\n  query SellerStoreRegions($parentId: ID!) {\n    regions(parentId: $parentId) {\n      id\n      name\n    }\n  }\n": types.SellerStoreRegionsDocument,
    "\n  query SellerStoreSearchRegions($input: SearchRegionsInput!) {\n    searchRegions(input: $input) {\n      id\n      name\n      parentName\n      level\n    }\n  }\n": types.SellerStoreSearchRegionsDocument,
    "\n  query SellerStoreBusinessHours {\n    sellerStoreBusinessHours {\n      id\n      dayOfWeek\n      isClosed\n      openTime\n      closeTime\n    }\n  }\n": types.SellerStoreBusinessHoursDocument,
    "\n  mutation SellerStoreUpsertBusinessHour($input: SellerUpsertStoreBusinessHourInput!) {\n    sellerUpsertStoreBusinessHour(input: $input) {\n      id\n    }\n  }\n": types.SellerStoreUpsertBusinessHourDocument,
    "\n  query SellerStoreSpecialClosures($input: CursorInput) {\n    sellerStoreSpecialClosures(input: $input) {\n      items {\n        id\n        closureDate\n        reason\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n": types.SellerStoreSpecialClosuresDocument,
    "\n  mutation SellerStoreUpsertSpecialClosure($input: SellerUpsertStoreSpecialClosureInput!) {\n    sellerUpsertStoreSpecialClosure(input: $input) {\n      id\n    }\n  }\n": types.SellerStoreUpsertSpecialClosureDocument,
    "\n  mutation SellerStoreDeleteSpecialClosure($closureId: ID!) {\n    sellerDeleteStoreSpecialClosure(closureId: $closureId)\n  }\n": types.SellerStoreDeleteSpecialClosureDocument,
    "\n  query SellerStoreDailyCapacities($input: SellerDateCursorInput) {\n    sellerStoreDailyCapacities(input: $input) {\n      items {\n        id\n        capacityDate\n        capacity\n      }\n      totalCount\n    }\n  }\n": types.SellerStoreDailyCapacitiesDocument,
    "\n  mutation SellerStoreUpsertDailyCapacity($input: SellerUpsertStoreDailyCapacityInput!) {\n    sellerUpsertStoreDailyCapacity(input: $input) {\n      id\n    }\n  }\n": types.SellerStoreUpsertDailyCapacityDocument,
    "\n  mutation SellerStoreDeleteDailyCapacity($capacityId: ID!) {\n    sellerDeleteStoreDailyCapacity(capacityId: $capacityId)\n  }\n": types.SellerStoreDeleteDailyCapacityDocument,
    "\n  query SellerStorePickupCalendar($storeId: ID!, $yearMonth: String!) {\n    pickupCalendar(storeId: $storeId, yearMonth: $yearMonth) {\n      yearMonth\n      days {\n        date\n        selectable\n        reason\n      }\n    }\n  }\n": types.SellerStorePickupCalendarDocument,
    "\n  query SellerStorePickupTimeSlots($storeId: ID!, $date: String!) {\n    pickupTimeSlots(storeId: $storeId, date: $date) {\n      date\n      morning {\n        time\n        available\n      }\n      afternoon {\n        time\n        available\n      }\n    }\n  }\n": types.SellerStorePickupTimeSlotsDocument,
    "\n  mutation SellerUploadsCreateUploadUrl($input: SellerCreateUploadUrlInput!) {\n    sellerCreateUploadUrl(input: $input) {\n      uploadUrl\n      publicUrl\n    }\n  }\n": types.SellerUploadsCreateUploadUrlDocument,
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
export function graphql(source: "\n  mutation SellerProductCreate($input: SellerCreateProductInput!) {\n    sellerCreateProduct(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerProductCreateDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerProductAddImage($input: SellerAddProductImageInput!) {\n    sellerAddProductImage(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerProductAddImageDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerProductSetCategories($input: SellerSetProductCategoriesInput!) {\n    sellerSetProductCategories(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerProductSetCategoriesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerProductSetTags($input: SellerSetProductTagsByNameInput!) {\n    sellerSetProductTagsByName(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerProductSetTagsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerProductCreateOptionGroup($input: SellerCreateOptionGroupInput!) {\n    sellerCreateOptionGroup(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerProductCreateOptionGroupDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerProductCreateOptionItem($input: SellerCreateOptionItemInput!) {\n    sellerCreateOptionItem(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerProductCreateOptionItemDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerProductTagSearch($input: SellerTagSearchInput!) {\n    sellerSearchTags(input: $input) {\n      id\n      name\n      isExactMatch\n      productCount\n    }\n  }\n"): typeof import('./graphql').SellerProductTagSearchDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerPushRegisterToken($input: SellerRegisterPushTokenInput!) {\n    sellerRegisterPushToken(input: $input)\n  }\n"): typeof import('./graphql').SellerPushRegisterTokenDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerPushUnregisterToken($input: SellerUnregisterPushTokenInput!) {\n    sellerUnregisterPushToken(input: $input)\n  }\n"): typeof import('./graphql').SellerPushUnregisterTokenDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment SellerReviewMediaFields on ReviewMedia {\n    mediaType\n    mediaUrl\n    thumbnailUrl\n    sortOrder\n  }\n"): typeof import('./graphql').SellerReviewMediaFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerReviewsList($input: StoreReviewsInput!) {\n    storeReviews(input: $input) {\n      items {\n        id\n        rating\n        content\n        media {\n          ...SellerReviewMediaFields\n        }\n        likeCount\n        authorNickname\n        productName\n        createdAt\n      }\n      totalCount\n      photoTotalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerReviewsListDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerReviewsDetail($reviewId: ID!) {\n    reviewDetail(reviewId: $reviewId) {\n      review {\n        id\n        rating\n        content\n        media {\n          ...SellerReviewMediaFields\n        }\n        likeCount\n        commentCount\n        authorNickname\n        customOptions {\n          groupName\n          optionTitle\n        }\n        createdAt\n      }\n      product {\n        productId\n        name\n        thumbnailUrl\n        regularPrice\n        salePrice\n      }\n    }\n  }\n"): typeof import('./graphql').SellerReviewsDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerReviewsComments($input: ReviewCommentsInput!) {\n    reviewComments(input: $input) {\n      items {\n        id\n        content\n        authorNickname\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerReviewsCommentsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerSettingsStore {\n    sellerMyStore {\n      id\n      storeName\n    }\n  }\n"): typeof import('./graphql').SellerSettingsStoreDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreAuditLogs($input: SellerAuditLogListInput) {\n    sellerAuditLogs(input: $input) {\n      items {\n        id\n        targetType\n        targetId\n        action\n        beforeJson\n        afterJson\n        createdAt\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerStoreAuditLogsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreCreateFaqTopic($input: SellerCreateFaqTopicInput!) {\n    sellerCreateFaqTopic(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerStoreCreateFaqTopicDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreUpdateFaqTopic($input: SellerUpdateFaqTopicInput!) {\n    sellerUpdateFaqTopic(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerStoreUpdateFaqTopicDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreDeleteFaqTopic($topicId: ID!) {\n    sellerDeleteFaqTopic(topicId: $topicId)\n  }\n"): typeof import('./graphql').SellerStoreDeleteFaqTopicDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  fragment SellerStoreFields on SellerStore {\n    id\n    storeName\n    storePhone\n    addressFull\n    addressCity\n    addressDistrict\n    addressNeighborhood\n    mapProvider\n    websiteUrl\n    businessHoursText\n    profileImageUrl\n    greetingMessage\n    pickupSlotIntervalMinutes\n    minLeadTimeMinutes\n    maxDaysAhead\n    isActive\n  }\n"): typeof import('./graphql').SellerStoreFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreMyStore {\n    sellerMyStore {\n      ...SellerStoreFields\n    }\n  }\n"): typeof import('./graphql').SellerStoreMyStoreDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreRating($storeId: ID!) {\n    storeDetail(storeId: $storeId) {\n      id\n      ratingAverage\n      reviewCount\n    }\n  }\n"): typeof import('./graphql').SellerStoreRatingDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreUpdateBasicInfo($input: SellerUpdateStoreBasicInfoInput!) {\n    sellerUpdateStoreBasicInfo(input: $input) {\n      ...SellerStoreFields\n    }\n  }\n"): typeof import('./graphql').SellerStoreUpdateBasicInfoDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreUpdatePickupPolicy($input: SellerUpdatePickupPolicyInput!) {\n    sellerUpdatePickupPolicy(input: $input) {\n      ...SellerStoreFields\n    }\n  }\n"): typeof import('./graphql').SellerStoreUpdatePickupPolicyDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreCreateUploadUrl($input: SellerCreateUploadUrlInput!) {\n    sellerCreateUploadUrl(input: $input) {\n      uploadUrl\n      publicUrl\n    }\n  }\n"): typeof import('./graphql').SellerStoreCreateUploadUrlDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreFaqTopics {\n    sellerFaqTopics {\n      id\n      storeId\n      title\n      answerHtml\n      sortOrder\n      isActive\n      createdAt\n      updatedAt\n    }\n  }\n"): typeof import('./graphql').SellerStoreFaqTopicsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStorePreviewDetail($storeId: ID!) {\n    storeDetail(storeId: $storeId) {\n      id\n      storeName\n      regionLabel\n      ratingAverage\n      reviewCount\n      images\n    }\n    storeProductCategories(storeId: $storeId) {\n      id\n      name\n      sortOrder\n      productCount\n    }\n  }\n"): typeof import('./graphql').SellerStorePreviewDetailDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStorePreviewProducts($input: StoreProductsInput!) {\n    storeProducts(input: $input) {\n      items {\n        product {\n          id\n          name\n          thumbnailUrl\n          regularPrice\n          salePrice\n          discountRate\n        }\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerStorePreviewProductsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStorePreviewProduct($productId: ID!) {\n    productDetail(productId: $productId) {\n      id\n      name\n      description\n      purchaseNotice\n      images\n      regularPrice\n      salePrice\n      discountRate\n    }\n  }\n"): typeof import('./graphql').SellerStorePreviewProductDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreRegionGroups {\n    regionGroups {\n      id\n      name\n      hasChildren\n    }\n  }\n"): typeof import('./graphql').SellerStoreRegionGroupsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreRegions($parentId: ID!) {\n    regions(parentId: $parentId) {\n      id\n      name\n    }\n  }\n"): typeof import('./graphql').SellerStoreRegionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreSearchRegions($input: SearchRegionsInput!) {\n    searchRegions(input: $input) {\n      id\n      name\n      parentName\n      level\n    }\n  }\n"): typeof import('./graphql').SellerStoreSearchRegionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreBusinessHours {\n    sellerStoreBusinessHours {\n      id\n      dayOfWeek\n      isClosed\n      openTime\n      closeTime\n    }\n  }\n"): typeof import('./graphql').SellerStoreBusinessHoursDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreUpsertBusinessHour($input: SellerUpsertStoreBusinessHourInput!) {\n    sellerUpsertStoreBusinessHour(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerStoreUpsertBusinessHourDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreSpecialClosures($input: CursorInput) {\n    sellerStoreSpecialClosures(input: $input) {\n      items {\n        id\n        closureDate\n        reason\n      }\n      totalCount\n      hasMore\n      nextCursor\n    }\n  }\n"): typeof import('./graphql').SellerStoreSpecialClosuresDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreUpsertSpecialClosure($input: SellerUpsertStoreSpecialClosureInput!) {\n    sellerUpsertStoreSpecialClosure(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerStoreUpsertSpecialClosureDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreDeleteSpecialClosure($closureId: ID!) {\n    sellerDeleteStoreSpecialClosure(closureId: $closureId)\n  }\n"): typeof import('./graphql').SellerStoreDeleteSpecialClosureDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStoreDailyCapacities($input: SellerDateCursorInput) {\n    sellerStoreDailyCapacities(input: $input) {\n      items {\n        id\n        capacityDate\n        capacity\n      }\n      totalCount\n    }\n  }\n"): typeof import('./graphql').SellerStoreDailyCapacitiesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreUpsertDailyCapacity($input: SellerUpsertStoreDailyCapacityInput!) {\n    sellerUpsertStoreDailyCapacity(input: $input) {\n      id\n    }\n  }\n"): typeof import('./graphql').SellerStoreUpsertDailyCapacityDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerStoreDeleteDailyCapacity($capacityId: ID!) {\n    sellerDeleteStoreDailyCapacity(capacityId: $capacityId)\n  }\n"): typeof import('./graphql').SellerStoreDeleteDailyCapacityDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStorePickupCalendar($storeId: ID!, $yearMonth: String!) {\n    pickupCalendar(storeId: $storeId, yearMonth: $yearMonth) {\n      yearMonth\n      days {\n        date\n        selectable\n        reason\n      }\n    }\n  }\n"): typeof import('./graphql').SellerStorePickupCalendarDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SellerStorePickupTimeSlots($storeId: ID!, $date: String!) {\n    pickupTimeSlots(storeId: $storeId, date: $date) {\n      date\n      morning {\n        time\n        available\n      }\n      afternoon {\n        time\n        available\n      }\n    }\n  }\n"): typeof import('./graphql').SellerStorePickupTimeSlotsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SellerUploadsCreateUploadUrl($input: SellerCreateUploadUrlInput!) {\n    sellerCreateUploadUrl(input: $input) {\n      uploadUrl\n      publicUrl\n    }\n  }\n"): typeof import('./graphql').SellerUploadsCreateUploadUrlDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Ping {\n    ping\n  }\n"): typeof import('./graphql').PingDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
