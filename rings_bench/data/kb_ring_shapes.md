# Laundering pattern reference (for the Rings bench; plain words, our own reading of IBM AMLworld's planted shapes)

Fan-out: one account sends money to many different accounts in a short window. The sender is usually a pass-through: money arrived shortly before. Look for one account with many distinct recipients and a burst of outgoing transfers.

Fan-in: many different accounts send money to one account in a short window; the receiver then often moves it on. Look for one account with many distinct senders and an incoming burst.

Cycle: money goes from A to B to C and back to A (two or more hops), so the loop returns money to where it started. Look for a directed loop among the accounts; amounts along the loop are similar.

Chain (stack): money is passed along A to B to C to D, each account forwarding soon after receiving, often with similar amounts. Look for pass-through accounts: money in, then out within hours.

Scatter-gather: one account splits money out to several accounts (scatter), and those accounts send it on to one collecting account (gather). Looks like a fan-out followed by a fan-in through the same middle accounts.

Gather-scatter: the mirror: many accounts send to one, which then sends out to many.

Mesh (bipartite): a group of accounts trade among themselves with many transfers in both directions, more than ordinary customers would.

Lone transfer: a single suspicious transfer with no visible structure around it; from the rows alone it cannot be told apart from ordinary traffic, so a verdict on it should carry low confidence.

Ordinary traffic also has busy accounts (a payroll account, a merchant, a bank's own settlement account) with many counterparties over many days and mixed payment formats. Structure plus timing, not volume alone, is the signal. Being busy is not a reason.
