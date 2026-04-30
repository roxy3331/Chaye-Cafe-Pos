# Security Specification - Chaye Cafe POS

## Data Invariants
1. A Stock Item must always have a `name` and `stock` count.
2. A Purchase Record must match an existing user's intent to buy.
3. Expenses must have a positive `amount`.
4. Only 'owner' can delete records or view reports.
5. All IDs must follow standard string constraints.

## The Dirty Dozen Payloads (Targeted Attacks)

1. **Identity Spoofing**: Attempt to create a stock item with a spoofed `ownerId` (if we used one).
2. **Resource Poisoning**: Large string injected into `name` field (e.g. 1MB).
3. **Invalid Type**: Sending a string for `stock` count.
4. **Negative Value**: Setting `amount` to -1000 in Expenses.
5. **Unauthorized Write**: 'employee' trying to delete a vendor.
6. **Bypassing Validation**: Update `averageBuy` without using the validation helper (if rules were loose).
7. **Orphaned Record**: Deleting a StockItem header but keeping related data (not enforced by rules directly but logic check).
8. **Shadow Field**: Adding `isVerified: true` to a StockItem.
9. **Role Escalation**: Attempting to set `role: 'owner'` in a user profile (system-only field).
10. **PII Leak**: Non-admin trying to 'get' private user list if it existed.
11. **Update Gap**: Changing `name` in a StockItem during an update where only `stock` should change.
12. **Future Timestamp**: Sending a `date` in 2100 for an Expense.

## Test Runner Logic
The `firestore.rules.test.ts` will verify these payloads return `PERMISSION_DENIED`.
