export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

export interface OAuthUserInfo {
  sub: string;
  preferred_username: string;
  name: string;
  role: string;
  email: string;
  department: string;
}

export interface OAuthIntrospectResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  sub?: string;
  iss?: string;
}

export interface OpenIdDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  revocation_endpoint: string;
  introspection_endpoint: string;
  jwks_uri: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  scopes_supported: string[];
  claims_supported: string[];
}

export interface PkcePair {
  verifier: string;
  challenge: string;
  method: string;
  state: string;
}
