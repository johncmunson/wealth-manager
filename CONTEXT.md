# Wealth Manager

Wealth Manager helps long-term investors manage a brokerage portfolio according to an explicit investment strategy.

## People and accounts

**User**:
A person who signs in to Wealth Manager. Each User may be linked to one Brokerage Account.
_Avoid_: Customer, client, account holder

**Brokerage Account**:
The Alpaca-hosted investing account linked to a User and managed through Wealth Manager.
_Avoid_: User account, Alpaca account

**Provisioning**:
The process of creating a Brokerage Account and linking it to a User. Its state is pending, linked, failed when non-creation is confirmed, or unknown when external creation cannot safely be ruled out.
_Avoid_: Registration, onboarding

## Investing

**Portfolio**:
The assets and cash held in a Brokerage Account, viewed together as the User's investments.
_Avoid_: Account

**Strategy**:
The User's intended Target Allocation, used as the reference for Portfolio construction, trading, Rebalancing, and automation.
_Avoid_: Plan, portfolio

**Allocation**:
The percentage distribution of a Portfolio or Strategy across categories of Assets.
_Avoid_: Mix, breakdown

**Target Allocation**:
The Allocation prescribed by a Strategy.
_Avoid_: Goal allocation, desired mix

**Strategy Drift**:
The difference between a Portfolio's current Allocation and its Target Allocation.
_Avoid_: Misalignment, deviation

**Rebalancing**:
Changing a Portfolio's Holdings to reduce Strategy Drift.
_Avoid_: Realignment

**Asset**:
A security that can be held or traded. Wealth Manager currently supports stocks and ETFs; bonds are unsupported.
_Avoid_: Investment, instrument

**Holding**:
The quantity and value of an Asset currently owned in a Portfolio.
_Avoid_: Position

**Available-to-Sell Quantity**:
The portion of a Holding that may currently be sold after accounting for shares committed to open Orders.
_Avoid_: Holding quantity, owned shares

**Symbol**:
The ticker code used to identify an Asset, such as AAPL or VTI.
_Avoid_: Ticker

**Tradable Asset**:
An active stock or ETF that Alpaca currently permits the Brokerage Account to trade.
_Avoid_: Supported security, available investment

**Order**:
An instruction to buy or sell an Asset through a Brokerage Account, specified in either dollars or shares. Wealth Manager currently supports only Market Orders, and Sell Orders may only reduce an existing Holding.
_Avoid_: Trade, transaction

**Market Order**:
An Order to buy or sell promptly at the available market price; its execution price is not guaranteed.
_Avoid_: Instant Order

**Day Order**:
An Order eligible for execution during the next applicable regular market session and expired if it remains unfilled when that session ends. Wealth Manager does not currently support extended-hours trading.
_Avoid_: Good-for-day Order

**Placed Order**:
An Order accepted by Alpaca but not necessarily executed.
_Avoid_: Completed Order, successful trade

**Filled Order**:
An Order whose requested purchase or sale has been fully executed.
_Avoid_: Placed Order, completed trade

**Activity**:
The unified history of Orders and other events affecting a Brokerage Account.
_Avoid_: Transaction history

**Funding**:
The product area for understanding a Brokerage Account's cash availability and Transfers.
_Avoid_: Banking, transfer

**Funding Source**:
The synthetic sandbox bank account connected to a Brokerage Account for deposits and withdrawals. It is represented to every User as “Chase Checking •••• 4242” and is not a real linked bank account.
_Avoid_: Linked bank, bank account

**Account Seeding**:
Internally adding synthetic cash to a Brokerage Account for demos and testing. Account Seeding is not a User-initiated Transfer.
_Avoid_: Deposit, funding, transfer

**Sweep Account**:
The sandbox firm-owned account whose synthetic cash may be moved into Brokerage Accounts for Account Seeding.
_Avoid_: Funding Source, bank account, Brokerage Account

**Buying Power**:
The amount currently available in a Brokerage Account for placing Orders. It may differ from cash that can be withdrawn.
_Avoid_: Available cash, balance

**Withdrawable Cash**:
The cash currently eligible to be withdrawn from a Brokerage Account.
_Avoid_: Buying Power, balance

**Transfer**:
A movement of cash into or out of a Brokerage Account, including pending movements.
_Avoid_: Funding, transaction
