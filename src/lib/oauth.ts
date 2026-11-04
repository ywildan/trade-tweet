/** OAuth hanya aktif bila kredensialnya tersedia di environment. */
export const enabledOAuthProviders = {
  google: Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  ),
  twitter: Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET),
};
