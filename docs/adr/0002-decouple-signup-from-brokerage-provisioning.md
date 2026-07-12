# Decouple signup success from Brokerage Account provisioning success

Provisioning is attempted synchronously after a User is created, but its failure cannot fail authentication signup. Wealth Manager persists a single provisioning record per User and distinguishes confirmed non-creation from an unknown outcome, because retrying an ambiguous account-creation request could create a duplicate external Brokerage Account; reconciliation must precede any retry of an unknown outcome.
