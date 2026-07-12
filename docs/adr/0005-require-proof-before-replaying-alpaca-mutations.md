# Require proof before replaying Alpaca mutations

Alpaca requests may recover from an authentication failure by refreshing credentials and replaying once, but mutations default to no replay unless the caller can prove the operation is idempotent. This trades some automatic recovery for protection against duplicate Brokerage Accounts, Orders, or Transfers when Alpaca may have applied the first request before returning an authentication failure.
