export interface TPPAuthConfig {
  keycloakTokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes?: string[];
  obieBaseUrl?: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface OBIEError {
  Code: string;
  Id: string;
  Message: string;
  Errors: Array<{
    ErrorCode: string;
    Message: string;
    Path?: string;
    Url?: string;
  }>;
}

export interface OBIEAccountAccessConsentRequest {
  Data: {
    Permissions: AccountAccessPermission[];
    ExpirationDateTime?: string;
    TransactionFromDateTime?: string;
    TransactionToDateTime?: string;
  };
  Risk: Record<string, unknown>;
}

export type AccountAccessPermission =
  | 'ReadAccountsBasic'
  | 'ReadAccountsDetail'
  | 'ReadBalances'
  | 'ReadBeneficiariesBasic'
  | 'ReadBeneficiariesDetail'
  | 'ReadDirectDebits'
  | 'ReadOffers'
  | 'ReadPAN'
  | 'ReadParty'
  | 'ReadPartyPSU'
  | 'ReadProducts'
  | 'ReadScheduledPaymentsBasic'
  | 'ReadScheduledPaymentsDetail'
  | 'ReadStandingOrdersBasic'
  | 'ReadStandingOrdersDetail'
  | 'ReadStatementsBasic'
  | 'ReadStatementsDetail'
  | 'ReadTransactionsBasic'
  | 'ReadTransactionsCredits'
  | 'ReadTransactionsDebits'
  | 'ReadTransactionsDetail';

export interface OBIEAccountAccessConsentResponse {
  Data: {
    ConsentId: string;
    Status: 'AwaitingAuthorisation' | 'Authorised' | 'Rejected' | 'Revoked';
    StatusUpdateDateTime: string;
    CreationDateTime: string;
    Permissions: AccountAccessPermission[];
    ExpirationDateTime?: string;
    TransactionFromDateTime?: string;
    TransactionToDateTime?: string;
  };
  Risk: Record<string, unknown>;
  Links: {
    Self: string;
  };
  Meta: {
    TotalPages?: number;
  };
}

export interface OBIEDomesticPaymentConsentRequest {
  Data: {
    Initiation: {
      InstructionIdentification: string;
      EndToEndIdentification: string;
      InstructedAmount: {
        Amount: string;
        Currency: string;
      };
      CreditorAccount: {
        SchemeName: string;
        Identification: string;
        Name: string;
      };
      RemittanceInformation?: {
        Reference?: string;
        Unstructured?: string;
      };
    };
  };
  Risk: {
    PaymentContextCode?: string;
    MerchantCategoryCode?: string;
    MerchantCustomerIdentification?: string;
  };
}

export interface OBIEDomesticPaymentConsentResponse {
  Data: {
    ConsentId: string;
    Status: 'AwaitingAuthorisation' | 'Authorised' | 'Consumed' | 'Rejected';
    StatusUpdateDateTime: string;
    CreationDateTime: string;
    Initiation: OBIEDomesticPaymentConsentRequest['Data']['Initiation'];
  };
  Risk: OBIEDomesticPaymentConsentRequest['Risk'];
  Links: {
    Self: string;
  };
  Meta: {
    TotalPages?: number;
  };
}

export interface AuthCodeExchangeResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  consentId?: string;
}
