/**
 * OBIE permission code to human-readable label mapping.
 *
 * Covers all UK Open Banking Read/Write Data Cluster permissions
 * as defined in the Account and Transaction API Specification v3.1.
 */

export interface PermissionLabel {
  en: string;
  ar: string;
}

export const PERMISSION_LABELS: Record<string, PermissionLabel> = {
  // Account information
  ReadAccountsBasic: {
    en: "View account names and types",
    ar: "\u0639\u0631\u0636 \u0623\u0633\u0645\u0627\u0621 \u0648\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a",
  },
  ReadAccountsDetail: {
    en: "View account details including numbers",
    ar: "\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0645\u0627 \u0641\u064a \u0630\u0644\u0643 \u0627\u0644\u0623\u0631\u0642\u0627\u0645",
  },

  // Balances
  ReadBalances: {
    en: "View account balances",
    ar: "\u0639\u0631\u0636 \u0623\u0631\u0635\u062f\u0629 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a",
  },

  // Transactions
  ReadTransactionsBasic: {
    en: "View transaction history",
    ar: "\u0639\u0631\u0636 \u0633\u062c\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a",
  },
  ReadTransactionsDetail: {
    en: "View detailed transactions including merchant info",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0627\u0644\u062a\u0641\u0635\u064a\u0644\u064a\u0629 \u0628\u0645\u0627 \u0641\u064a \u0630\u0644\u0643 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u0627\u062c\u0631",
  },
  ReadTransactionsCredits: {
    en: "View incoming transactions",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0627\u0644\u0648\u0627\u0631\u062f\u0629",
  },
  ReadTransactionsDebits: {
    en: "View outgoing transactions",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0627\u0644\u0635\u0627\u062f\u0631\u0629",
  },

  // Beneficiaries
  ReadBeneficiariesBasic: {
    en: "View saved beneficiaries",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0633\u062a\u0641\u064a\u062f\u064a\u0646 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u064a\u0646",
  },
  ReadBeneficiariesDetail: {
    en: "View beneficiary account details",
    ar: "\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u0641\u064a\u062f\u064a\u0646",
  },

  // Standing orders
  ReadStandingOrdersBasic: {
    en: "View standing orders",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062f\u0627\u0626\u0645\u0629",
  },
  ReadStandingOrdersDetail: {
    en: "View standing order details",
    ar: "\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062f\u0627\u0626\u0645\u0629",
  },

  // Direct debits
  ReadDirectDebits: {
    en: "View direct debits",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u062e\u0635\u0645 \u0627\u0644\u0645\u0628\u0627\u0634\u0631",
  },

  // Products
  ReadProducts: {
    en: "View product information",
    ar: "\u0639\u0631\u0636 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c",
  },

  // Offers
  ReadOffers: {
    en: "View available offers",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u0645\u062a\u0627\u062d\u0629",
  },

  // Party
  ReadParty: {
    en: "View your personal information",
    ar: "\u0639\u0631\u0636 \u0645\u0639\u0644\u0648\u0645\u0627\u062a\u0643 \u0627\u0644\u0634\u062e\u0635\u064a\u0629",
  },
  ReadPartyPSU: {
    en: "View account holder information",
    ar: "\u0639\u0631\u0636 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0635\u0627\u062d\u0628 \u0627\u0644\u062d\u0633\u0627\u0628",
  },

  // Scheduled payments
  ReadScheduledPaymentsBasic: {
    en: "View scheduled payments",
    ar: "\u0639\u0631\u0636 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u062c\u062f\u0648\u0644\u0629",
  },
  ReadScheduledPaymentsDetail: {
    en: "View scheduled payment details",
    ar: "\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u062c\u062f\u0648\u0644\u0629",
  },

  // Statements
  ReadStatementsBasic: {
    en: "View account statements",
    ar: "\u0639\u0631\u0636 \u0643\u0634\u0648\u0641 \u0627\u0644\u062d\u0633\u0627\u0628",
  },
  ReadStatementsDetail: {
    en: "View detailed account statements",
    ar: "\u0639\u0631\u0636 \u0643\u0634\u0648\u0641 \u0627\u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u062a\u0641\u0635\u064a\u0644\u064a\u0629",
  },

  // Funds confirmation
  ReadFundsConfirmation: {
    en: "Confirm availability of funds",
    ar: "\u062a\u0623\u0643\u064a\u062f \u062a\u0648\u0641\u0631 \u0627\u0644\u0623\u0645\u0648\u0627\u0644",
  },

  // PAN (card number)
  ReadPAN: {
    en: "View card numbers",
    ar: "\u0639\u0631\u0636 \u0623\u0631\u0642\u0627\u0645 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a",
  },
};

/**
 * Translate a permission code to human-readable text.
 * Falls back to a formatted version of the code itself.
 */
export function getPermissionLabel(code: string, lang: "en" | "ar" = "en"): string {
  const label = PERMISSION_LABELS[code];
  if (label) {
    return label[lang];
  }
  // Fallback: split CamelCase into words
  return code.replace(/([A-Z])/g, " $1").trim();
}

/**
 * Group permissions into logical categories for display.
 */
export function groupPermissions(permissions: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const perm of permissions) {
    let category = "Other";
    if (perm.includes("Account")) category = "Accounts";
    else if (perm.includes("Balance")) category = "Balances";
    else if (perm.includes("Transaction")) category = "Transactions";
    else if (perm.includes("Beneficiar")) category = "Beneficiaries";
    else if (perm.includes("StandingOrder")) category = "Standing Orders";
    else if (perm.includes("DirectDebit")) category = "Direct Debits";
    else if (perm.includes("Product")) category = "Products";
    else if (perm.includes("Offer")) category = "Offers";
    else if (perm.includes("Party")) category = "Personal Info";
    else if (perm.includes("ScheduledPayment")) category = "Scheduled Payments";
    else if (perm.includes("Statement")) category = "Statements";
    else if (perm.includes("Funds")) category = "Funds Confirmation";
    else if (perm.includes("PAN")) category = "Card Details";

    if (!groups[category]) groups[category] = [];
    groups[category].push(perm);
  }

  return groups;
}
