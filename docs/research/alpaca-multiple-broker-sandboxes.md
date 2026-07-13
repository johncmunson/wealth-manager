# Alpaca multiple Broker sandboxes

## Recommendation

Treat Alpaca Broker API as providing **one sandbox environment per partner team**, with any number of end-user accounts inside it—not multiple self-service sandboxes. Use separate sandbox accounts for test data and scoped credentials for access control. If hard tenant isolation is required, ask Alpaca whether it can provision multiple correspondents (or another contracted arrangement) before designing around that assumption.

## Findings

### Explicit facts

- Broker sandbox traffic uses the fixed `broker-api.sandbox.alpaca.markets` endpoint ([Authentication](../../context/alpaca/01_welcome/04.authentication.md#L16-L20)). The dashboard switches between Sandbox and Live ([Integration Setup](../../context/alpaca/02_broker_api/05.integration_setup_with_alpaca.md#L15-L17)), and each team receives a pre-funded firm account in sandbox ([Getting Started](../../context/alpaca/02_broker_api/02.getting_started_with_broker_api.md#L236-L240)).
- A partner can create end-user accounts through the Account API; Alpaca explicitly says an omnibus partner may open “as many accounts as you want” in sandbox ([Account Opening](../../context/alpaca/02_broker_api/02_customer_account_opening/01.account_opening.md#L19-L21)). This is account multiplicity inside sandbox, not sandbox multiplicity.
- Additional Broker credentials are access-control instruments: only superusers can create them, and keys receive read-only, full, or per-scope custom permissions ([Credentials Management](../../context/alpaca/02_broker_api/03.credentials_management.md#L12-L14), [access controls](../../context/alpaca/02_broker_api/03.credentials_management.md#L32-L48)). The documentation does not describe credentials as creating environments.
- Trading API separately supports creating and deleting multiple paper accounts, each with new API keys ([Paper Trading](../../context/alpaca/03_trading_api/02.paper_trading.md#L60-L66)). Those accounts use `paper-api.alpaca.markets`, whereas Broker sandbox uses a different endpoint ([Authentication](../../context/alpaca/01_welcome/04.authentication.md#L9-L20)); this is not evidence of multiple Broker sandboxes.
- Authentication explicitly allows a broker partner to have more than one **correspondent**, each with separate credentials ([Authentication](../../context/alpaca/01_welcome/04.authentication.md#L22-L22)). It does not say partners can create correspondents themselves or that each correspondent receives an independent sandbox.
- The Broker OpenAPI declares only fixed Sandbox and Production servers ([OpenAPI](../../context/alpaca/02_broker_api/broker.openapi.yaml#L23079-L23088)). Structural inspection of all **118** path keys and their operation IDs found no environment, sandbox, tenant, team, or correspondent lifecycle endpoint. This absence is evidence about the published API surface, not proof that Alpaca cannot provision additional isolation operationally; the one correspondent-related operation ID concerns instant-funding limits, not lifecycle management.
- The sandbox-only demo-funding operation merely simulates an inbound funding-wallet deposit for an account belonging to the partner’s firm ([OpenAPI](../../context/alpaca/02_broker_api/broker.openapi.yaml#L14670-L14675)). It does not provision an environment.

### Inference

The documented self-service model is one Broker sandbox per team context, containing many customer accounts and credentials. Multiple distinct Broker sandboxes for one partner are **not established by the local Alpaca documentation or OpenAPI**. Multiple correspondents may be a possible Alpaca-managed isolation mechanism, but the sources are insufficient to equate correspondents with sandboxes.

## Questions for Alpaca

1. Can one contracted partner be provisioned with multiple independent Broker sandbox environments?
2. If yes, are they separate correspondents, teams, firm accounts, data stores, or another construct?
3. Who creates them—Alpaca support/onboarding or the partner—and are there limits or fees?
4. Does each correspondent receive separate sandbox and production credentials, firm accounts, dashboard views, event streams, and customer-account namespaces?
5. What isolation guarantees exist between correspondents, and can one dashboard user administer several of them?

## Confidence

**High** that the published self-service surface documents one fixed Broker sandbox and unlimited accounts within it. **Medium** on the stronger operational conclusion: Alpaca may offer undocumented, support-provisioned multi-correspondent or multi-sandbox arrangements, which requires direct confirmation.
