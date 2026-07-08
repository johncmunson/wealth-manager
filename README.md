# Wealth Manager

Wealth Manager is a web-first, agent-native brokerage for competent long-term investors who want to delegate portfolio management work without navigating traditional brokerage complexity.

It is not a trading terminal with a chatbot. It is a calm, high-trust investing workspace where an AI wealth manager helps users plan, execute, monitor, and automate a long-term portfolio.

> An AI-powered brokerage that helps you build and maintain a long-term portfolio without micromanaging every trade.

## Product Vision

The product combines:

- A ChatGPT-style agent workspace
- Brokerage account opening, funding, and execution
- Long-term portfolio strategy
- Rich interactive investing artifacts
- Automation for recurring portfolio maintenance
- A clear audit trail of actions and decisions

The surface should feel minimal and elegant. The underlying capabilities should be powerful, because the agent can handle complexity on the user's behalf.

## Target User

Wealth Manager is designed for investors who are:

- Comfortable with AI assistants and agentic workflows
- Intermediate to advanced long-term investors
- Short on time
- Interested in delegation, not day trading
- Looking for a streamlined alternative to feature-heavy brokerages

It is not optimized for absolute beginners, active traders, or users seeking a dense market terminal.

## Product Philosophy

The product should default toward:

- Simple portfolios
- Durable long-term investing
- Diversification
- Tax awareness where relevant
- Dollar-based investing language
- Low cognitive load
- Clear explanations and approvals

It should be opinionated, but not paternalistic: simple by default, flexible when needed.

## Core Experience

The app is chat-first.

Users should land in a new conversation, ask the wealth manager to help with investing work, and receive rich inline artifacts such as:

- Strategy drafts
- Portfolio allocation views
- Charts and tables
- Order previews
- Approval dialogs
- Automation cards
- Research briefs
- Portfolio reviews
- Receipts

Traditional pages exist to expose durable state. Chat is where work happens.

## Core Product Objects

### Conversations

Conversations are the primary workspace. Users can maintain multiple threads, compact long conversations, and return to prior investment work.

Important financial state should not live only in chat memory. Durable outcomes should be saved to first-class product objects.

### Strategy

Each brokerage account has one primary Strategy that acts as the north star for portfolio construction, trading, rebalancing, recurring investing, and automation.

A Strategy may include goals, time horizon, risk posture, target allocation, approved assets, exclusions, contribution plans, rebalancing philosophy, tax posture, rationale, and revision history.

### Portfolio

Portfolio represents current account state: value, holdings, allocation, cash, performance over time, and drift from Strategy.

The Portfolio surface should remain mostly passive, with chat-native calls to action such as reviewing drift, drafting a rebalance, or investing idle cash.

### Automations

Automations are delegated recurring or background behaviors, created and managed through the agent.

Examples include recurring investing, rebalance checks, drift alerts, and eventually tax-loss harvesting. Different automations may require approval or act within predefined limits.

### Activity

Activity is the trust and audit surface. Every meaningful action should leave behind a clear record of what happened and why, including orders, trades, deposits, automation runs, approvals, strategy changes, and agent actions.

## MVP Scope

The initial product should enable users to:

- Explore the product before funding an account
- Draft a long-term investment Strategy with the agent
- Open and fund a taxable brokerage account
- Execute market and simple limit orders through agent-generated previews
- Monitor account value, holdings, allocation, cash, and Strategy drift
- Delegate recurring investing and rebalancing checks
- Review all meaningful actions in Activity

Supported investments should focus on stocks, ETFs, and bond exposure where available. The default posture should favor diversified, long-term portfolios, while still supporting more sophisticated strategies.

## Out of Scope for MVP

The MVP should avoid:

- Crypto
- Options and futures
- IPO workflows
- Advanced active-trading tools
- Broad brokerage feature coverage for its own sake
- Standalone market-terminal-style asset pages
- Complex transfer and migration flows
- Noisy news or market-commentary notifications

## Guiding Principle

Wealth Manager should feel sparse and elegant on the surface, but powerful underneath: a brokerage where users delegate portfolio work to an agent they can understand, inspect, and trust.
