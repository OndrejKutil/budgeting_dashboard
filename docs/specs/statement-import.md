# Spec: Bank statement import (CSV / XLSX)

Status: **plan agreed, not implemented** · Branch: `develop`

## 1. Why

A new user starts with an empty ledger, and most of the app is computed from history (six-month
comparisons, monthly and yearly analytics, net worth, emergency fund). Loading the last 6-12
months from the bank on day one gives them a working dashboard immediately.

Screenshot import does not cover this: it is capped at 50 rows, costs two model calls per image,
and reviews one card per transaction.

## 2. Decisions made

| Topic | Decision |
|-------|----------|
| Formats | `.csv` and `.xlsx`. No PDF, no live bank connection. |
| First bank | Raiffeisenbank (both first users bank there). Other banks go through column mapping. |
| Category suggestions | One model call per import, for every user of the feature. The model sees only merchant text (section 7), never numbers that identify anyone. |
| Account balance | One extra transaction in the seeded `Starting Balance` category (type `exclude`). It shows in the ledger and counts toward the balance, like in-app transfers, and stays out of income and spending. |
| Rollout | Behind the per-user flag `statement_import`, removed once stable. |
| Scope per file | One file, one account. Only transactions are imported. |

## 3. User flow

Three screens. A Raiffeisen file never shows a technical question.

### Screen 1: Upload

- Drop the file or pick it.
- Choose the account it belongs to. Preselected when the user has exactly one. A user with no
  account opens the existing create-account dialog from here, with the name prefilled from the
  recognised bank ("Raiffeisenbank") and the currency from the file.
- Below: the list of past imports, each with **Undo**.

While the file is read the page shows one progress state ("Reading your file…"); this covers
parsing and the suggestion call, a few seconds in total.

### Screen 2: Review

One sentence on top: *"214 transactions from 1 May to 25 Oct 2026. 12 are already in your ledger
and will be skipped."*

Then one line per merchant, most frequent first:

```
Albert               38 payments    -4 210 Kč    [ Groceries          v ]  suggested
Lidl                 21 payments    -2 870 Kč    [ Groceries          v ]  suggested
Bageterie Boulevard   9 payments      -640 Kč    [ Cafes / Restaurants v ] suggested
Jiří K.               3 payments   +12 500 Kč    [ choose category    v ]
...
Everything else      64 payments    [ money out: Other expenses v ]  [ money in: Other Income v ]
```

- A category chosen on a line applies to all its transactions.
- Lines the app could fill in are marked as suggestions; the user only corrects wrong ones.
- "Everything else" collects every merchant that appears once or twice and has no suggestion, so
  nobody walks through 60 single lines. Its two pickers are preselected with the seeded
  `Other expenses` and `Other Income` categories when the user still has them.
- A line expands to its transactions. There a single row can get its own category, a different
  note, or be left out. Skipped duplicates are listed in their own collapsed line and can be
  included again.
- One optional field at the bottom: *"Account balance after the last transaction in this file
  (25 Oct 2026)"*, with one line of help text explaining that it makes the account show the right
  balance.
- One button: **Import 202 transactions**. It is disabled until every included row has a
  category, which the fallback pickers guarantee by default.

### Screen 3: Done

*"202 transactions imported into Raiffeisenbank."* with **View them** (transactions page filtered
to this import) and **Undo import**.

### Extra screen, only for an unrecognised file

Between screens 1 and 2: the first rows of the file as a table, and three questions answered by
clicking a column: which is the date, which is the amount, which is the description. Detected
answers are preselected. The mapping is saved with the import, so the next file into the same
account skips this screen.

### Entry points

Tools menu, the empty state of the transaction list ("Import from your bank"), the empty state of
the Accounts page.

## 4. The Raiffeisenbank export

Described from a real export (`Pohyby_<account number>_<timestamp>.csv`). That file contains
personal data and is **never committed**; it is excluded locally through `.git/info/exclude`.
Tests use a synthetic file with the same header and invented rows.

- UTF-8 with BOM, `;` delimiter, every value quoted, header on the first line, no balance column.
- Dates `dd.mm.yyyy`, decimal comma, signed amounts (money out is negative).

| Column | Use |
|--------|-----|
| `Datum provedení` | Transaction date (when the payment happened). |
| `Datum zaúčtování` | Booking date and time, up to a few days later for cards. Not used. |
| `Zaúčtovaná částka` | Signed amount in the account currency. Stored as is. |
| `Měna účtu` | Must equal the target account's currency. |
| `Původní částka`, `Původní měna` | Filled only for foreign-currency payments. Not stored. |
| `Název obchodníka` | Clean merchant name ("Albert", "Lidl"). Present on most card payments. |
| `Název protiúčtu` | Counterparty name on bank transfers. |
| `Zpráva` | Cards: `DESCRIPTOR; city; country`, sometimes with a leading original amount (`40,99 EUR;MERCHANT; ...`). Transfers: the message. |
| `Poznámka` | Cards: a copy of `Zpráva`. Incoming transfers: the sender's message. |
| `Typ transakce` | Card payment, online payment, incoming / outgoing transfer, ATM withdrawal. |
| `Číslo účtu` | The user's own account. Used only to reject a file that mixes several accounts. Not stored. |
| `Číslo protiúčtu`, `VS`, `KS`, `SS`, `Id transakce`, `Město`, `Kategorie transakce`, `Vlastní poznámka` | Not used, except `Vlastní poznámka`, which is appended to the note when filled. |
| `Poplatky` | Always `0` in the sample. Rows with a non-zero fee get a warning in review until it is confirmed on a real example whether the fee is already inside `Zaúčtovaná částka`. |

### Rules for this preset

**Merchant** (what lines are grouped by): the first non-empty of

1. `Název obchodníka`
2. `Název protiúčtu`
3. the first text segment of `Zpráva`, skipping a leading original-amount segment and trimming
   trailing reference codes
4. `Typ transakce`

**Message**: the user-written text of a transfer. `Poznámka` when it differs from `Zpráva`,
otherwise `Zpráva` when the row is not a card payment. Empty for card payments.

**Note** stored on the transaction: the merchant, followed by the message when there is one
(`"Jan Novák · padel"`), followed by `Vlastní poznámka` when filled. Card descriptors, cities and
country codes are dropped.

**Kind**: `card`, `transfer_in`, `transfer_out` or `cash`, derived from `Typ transakce`. Used for
the suggestion call and for nothing else.

## 5. Backend

### 5.1 Layout

```
src/backend/
├── routers/statement_import.py          # endpoints only
├── helper/statement_import/
│   ├── reader.py        # bytes -> header + rows of cells (csv, xlsx)
│   ├── mapping.py       # StatementMapping, presets, header detection
│   ├── normalize.py     # one raw row -> draft row (date, amount, merchant, message, note, kind)
│   ├── duplicates.py    # multiset comparison against existing transactions
│   └── suggest.py       # merchant list -> category suggestions (history, then model)
└── tests/test_statement_import.py
```

The router is registered in `backend_server.py` under `/statement-import`. Every endpoint uses
`Depends(api_key_auth)` + `Depends(get_current_user)`, checks the `statement_import` flag with
`is_feature_enabled` (403 otherwise), and uses the user's RLS-scoped client.

New dependency: `openpyxl` for `.xlsx`.

### 5.2 Endpoints

| Method | Path | Rate limit | Purpose |
|--------|------|-----------|---------|
| `POST` | `/statement-import/preview` | `bulk` | Multipart: `file`, `account_id`, optional `mapping` (JSON). Parses and returns drafts. Writes nothing. |
| `POST` | `/statement-import/commit` | `bulk` | Saves reviewed rows as transactions in one batch. |
| `GET` | `/statement-import/batches` | `read_only` | The user's past imports, newest first. |
| `DELETE` | `/statement-import/batches/{id}` | `write` | Undo one import. |

Nothing is kept on the server between preview and commit; the frontend holds the drafts.
Parsing is in the backend, not the browser, because these rules need unit tests and CI only runs
backend tests.

### 5.3 Preview

Rejections before any parsing: wrong extension or content type (415), empty file (400), larger
than 5 MB (413), account not the user's (404).

1. **Read.** CSV: decode as UTF-8 with BOM, then `cp1250`; sniff the delimiter among `;` `,`
   tab; the header is the first line whose column count matches the following lines. XLSX: the
   first sheet, read-only mode, same header rule; cells that are already dates or numbers are
   accepted as such. More than 5,000 data rows is a 400 asking the user to export a shorter
   period.
2. **Mapping.** In order: the mapping sent by the client, a preset whose required headers are all
   present, the `mapping_json` of this account's latest batch if its columns exist in the file.
   If none applies, the response has `needs_mapping: true`, the headers, the first 10 raw rows
   and a best-guess mapping from header names; nothing else is computed.
3. **Normalise** every row to a draft (date, amount, merchant, message, note, kind). A row that
   fails gets `error` set and is left out by default; it never fails the file.
4. **File-level checks.** More than one distinct own-account number, or a currency different from
   the account's, is a 400 with a plain message.
5. **Duplicates** (section 5.5).
6. **Suggestions** (section 7).

Response `StatementPreviewData`:

| Field | Meaning |
|-------|---------|
| `needs_mapping`, `headers`, `sample_rows`, `mapping`, `preset` | Mapping state. `preset` is the recognised bank's key and display name, or null. |
| `rows` | List of `StatementDraftRow`. |
| `date_from`, `date_to`, `currency` | For the summary sentence and the balance field label. |
| `suggestions_available` | False when the model call failed or was skipped, so the page can say suggestions are missing instead of looking empty by design. |

`StatementDraftRow`: `row_number`, `date`, `amount`, `merchant`, `merchant_key`
(`normalize_merchant(merchant)`), `notes`, `category_id_fk`, `category_source` (existing
`FieldSource`: `rule`, `model` or `none`), `duplicate`, `warning`, `error`.

The frontend groups rows by `merchant_key` plus direction (money in / money out), so payments to
a person and payments from the same person are separate lines.

### 5.4 Commit

Request `StatementCommitRequest`: `account_id`, `file_name`, `preset`, `mapping`, `rows` (each
`date`, `amount`, `notes`, `category_id_fk`), optional `closing_balance`.

1. Validate: 1 to 5,000 rows; the account and every `category_id_fk` belong to the user (read the
   user's accounts and categories through the RLS client and check membership).
2. Insert the `fct_import_batches` row.
3. Insert all transactions in one PostgREST call with `import_batch_id_fk` set. One call is one
   SQL statement, so it is all or nothing.
4. If step 3 fails, delete the batch row and return the error.
5. Balance adjustment (section 6), in the same batch.

Two inserts with a compensating delete rather than a Postgres function: `rpc()` in the pinned
Supabase client already needed two fixes for `/recurring/post-due`.

Response: the batch (`ImportBatchData`) and the number of rows written.

### 5.5 Duplicates

The account's existing transactions between `date_from` and `date_to` are compared with the file
as a multiset on `(date, amount)`. Two identical rows in the file against one in the ledger marks
exactly one as a duplicate. Duplicates are skipped by default.

This covers a second import of an overlapping period and rows typed by hand. A hand-typed row
dated on the booking day instead of the payment day is missed; accepted.

### 5.6 Undo

`DELETE /statement-import/batches/{id}` deletes the transactions with that `import_batch_id_fk`,
then the batch. Transactions edited after the import are deleted too; the confirmation dialog
says so and shows the count.

### 5.7 Mapping shape

A mapping is data, so a bank preset is one entry in a list and the mapping screen produces the
same shape:

| Field | Meaning |
|-------|---------|
| `date_column`, `date_format` | |
| `amount_column` | A signed amount, **or** |
| `debit_column`, `credit_column` | separate money-out / money-in columns |
| `decimal_separator` | `,` or `.` |
| `currency_column` | Optional |
| `merchant_columns` | In priority order; the first non-empty wins |
| `message_columns` | Optional |
| `own_account_column` | Optional, for the mixed-accounts check |

The Raiffeisen rules in section 4 that go beyond this (splitting `Zpráva`, deriving `kind`) live
in a small preset-specific function next to the preset. Presets shipped: Raiffeisenbank and this
app's own export from `/export/transactions`. A preset is only added from a real export.

## 6. Account balance

Balances are the sum of an account's transactions (`accounts_calc.py`). After importing six
months the account would show only the net movement of those months, and the Raiffeisen file has
no balance column.

When the user fills in the balance, the commit adds one transaction:

- amount: `stated balance - (account balance before the import + sum of the imported rows)`
- date: the day before the first imported row
- note: "Starting balance"
- category: the user's `Starting Balance` category. Lookup order: an active category with that
  name and type `exclude`; any active `exclude`-type category; otherwise one is created with the
  template's values (`Starting Balance`, `exclude`).

Nothing is added when the field is empty or the result is zero.

This matches how the app already treats in-app transfers: they are saved in the `Exclude`
category, appear in the ledger, count toward the balance, and are ignored by the income and
spending figures because those filter on category type (`summary_calc.py`).

Importing an older file into an account that already has a starting balance works with the same
formula: the new adjustment corrects the difference.

## 7. Category suggestions

Sources, in order:

1. **The user's history**, `helper/merchant_history.py` unchanged. A merchant filed the same way
   at least twice gets that category (`category_source: rule`). Empty for a new user.
2. **The model**, for the merchants still without a category (`category_source: model`).
3. **The user**, on the review screen.

### 7.1 What the model sees

One text-only call to `REASONING_MODEL` through the existing `LLMClient`. The payload is built on
the server from the parsed rows, so the limits below do not depend on the frontend.

Per distinct merchant, and nothing else:

| Sent | Example |
|------|---------|
| Merchant text | `"Albert"`, `"Jan Novák"` |
| Direction | `"out"` or `"in"` |
| Kind | `"card"`, `"transfer_in"`, `"transfer_out"`, `"cash"` |
| Up to 3 distinct messages, 80 characters each | `"padel"` |

Plus the user's active categories (`id`, `name`, `type`, `spending_type`), as screenshot import
already sends.

**Never sent:** amounts, totals or counts, dates, account numbers, card numbers, variable /
constant / specific symbols, transaction IDs, cities, the account holder's name, the file name.

As a second guard, every text is scrubbed before sending: any run of 4 or more digits and any
masked card pattern (`516872XXXXXX8303`) is removed, and a merchant left empty by that is not
sent. The payload is not logged.

Amount ranges are left out on purpose: the merchant and the direction carry nearly all the
signal, and amounts are the most sensitive part of the file.

### 7.2 The call

- Prompt: the category-matching guidance from `screenshot_import.py` moved to a shared constant,
  plus two additions: money moved to the user's own accounts or wallets and ATM withdrawals go to
  an `exclude`-type category; when nothing fits, answer null.
- Output: `{"merchants": [{"index": n, "category_id": id|null, "confidence": 0-1}]}`. Merchants
  are referenced by index so the model never has to repeat a name.
- Validation: a `category_id` that is not one of the user's is dropped; confidence under 0.6 is
  dropped.
- Size: the 150 merchants with the most transactions per call, at most 2 calls. The rest stay
  empty and fall under "Everything else".
- Failure of any kind (rate limit, retired model, bad JSON) is logged and the preview is returned
  without suggestions, with `suggestions_available: false`. The import never depends on it.

## 8. Database

One additive migration, `add_statement_import`:

- Table `fct_import_batches`: `import_batch_id_pk` (uuid PK), `user_id_fk` (→ `auth.users`,
  cascade), `account_id_fk` (→ `dim_accounts`, cascade), `file_name`, `preset`, `mapping_json`
  (jsonb), `row_count`, `date_from`, `date_to`, `created_at`. RLS enabled with select / insert /
  delete policies scoped to `auth.uid()`; no update policy.
- Column `fct_transactions.import_batch_id_fk` (uuid, nullable, → `fct_import_batches`,
  `on delete set null`) with a partial index where it is not null.
- Feature flag `statement_import`: the register statement and the backfill for existing users,
  as described in `docs/database/README.md`.

`on delete set null` means removing a batch record on its own never deletes money data; undo
deletes the transactions explicitly first. The uploaded file is not stored anywhere.

Also: add `IMPORT_BATCH_ID` to `TRANSACTIONS_COLUMNS` and an `import_batch_id` filter to
`apply_common_filters`, `GET /transactions/` and `GET /transactions/summary` for the "View them"
link.

Enabling the flag for the two first users is a data edit in the SQL editor, per the database doc.

## 9. Frontend

- `pages/dashboard/StatementImportPage.tsx`, parts in `pages/dashboard/statement-import/`:
  `UploadStep`, `MappingStep`, `ReviewStep` (`MerchantLine`, `RowTable`, `BalanceField`),
  `DoneStep`, `PastImports`.
- Route `/dashboard/import/statement` in `App.tsx` (lazy, like the screenshot page); nav entry in
  `layout/nav-config.ts` with `flag: 'statement_import'`.
- `lib/api/endpoints/statementImport.ts` (`preview` through `apiClient.postForm`, `commit`,
  `batches`, `undo`), exported from `endpoints/index.ts`. Types mirrored from the backend schemas
  into `lib/api/types/`.
- Drafts live in component state. A category picked on a merchant line is written to every row of
  the line that the user has not set individually. Rows of an expanded line are paginated so a
  line with hundreds of rows stays responsive.
- After commit and after undo: `invalidateTransactionData(queryClient)`, and invalidate
  `['statement-import', 'batches']`.
- The transactions page reads an `import` URL param and passes it as the new filter.
- Shared pieces move out of `ScreenshotImportPage.tsx` into a shared module instead of being
  copied: `CategorySelectItems` and the suggestion marker.
- Strings in `lib/i18n.ts` for `en-US` and `cs-CZ`. Visual rules per
  `docs/frontend/redesign-spec.md`.
- The privacy page gets one sentence: statement import sends merchant names and payment messages,
  without amounts or account numbers, to the model provider to suggest categories.

## 10. Build order

| # | Step | Done when |
|---|------|-----------|
| 1 | Reader, mapping, Raiffeisen preset, normaliser, tests on the synthetic fixture | `preview` returns correct drafts for a Raiffeisen CSV, without suggestions |
| 2 | Migration, schemas, `commit`, `batches`, undo, duplicates, starting balance, transaction filter | An import can be done and undone through the API |
| 3 | Frontend: upload, review by merchant, done, past imports, entry points | The two first users can import behind the flag |
| 4 | Suggestions: history rules plus the model call with the limits of section 7 | A new user's review screen arrives mostly filled in |
| 5 | Mapping screen, saved mapping per account, XLSX reading, own-export preset | Any bank's CSV or XLSX can be imported |

Steps 1-3 are the smallest version worth using. Each step ends with `mypy .`, `pytest` and
`npm run check` passing.

Docs to update as part of the work: router table and env notes in `docs/backend/README.md`,
routes and endpoint table in `docs/frontend/README.md`, tables in `docs/database/README.md` and
`CLAUDE.md`.

## 11. Tests

`tests/test_statement_import.py`, all on synthetic data:

- Reader: BOM, `cp1250`, each delimiter, header detection with preamble lines, XLSX with typed
  cells, row limit.
- Raiffeisen preset: one row of each kind (card with merchant name, card without, online payment
  with original currency, incoming transfer with message, outgoing transfer, ATM), checking date,
  amount, merchant, message, note and kind.
- Decimal comma, thousands separators, debit / credit columns.
- File-level checks: mixed accounts, wrong currency.
- Duplicates: multiset behaviour, date range.
- Suggestions: the payload for a fixture file contains none of the fixture's account numbers,
  card masks, amounts or dates; the digit scrubber; unknown and low-confidence ids dropped;
  provider failure returns a preview without suggestions.
- Commit: ownership checks, compensating delete when the insert fails, starting-balance maths and
  category lookup order.
- Feature flag off returns 403 on all four endpoints.

## 12. Still open

1. Fees: whether a non-zero `Poplatky` is already included in `Zaúčtovaná částka`. Needs one real
   row with a fee; until then such rows carry a warning.
2. Whether Raiffeisenbank offers an XLSX export with the same columns. If it does, the preset
   covers it for free; if not, XLSX only matters for other banks.

## 13. Additions after the first version

- **AI opt-out.** A switch on the upload screen (remembered in the browser) sends `use_ai=false`
  with the preview. Categories then come only from the user's history, nothing is sent to the
  model provider, and the response has `ai_skipped: true`.
- **One "Import" flow.** The page is framed as setting up the app from bank data, not only as
  a statement import: upload -> review transactions -> opening balances -> done. A user starting
  fresh doesn't use it at all and enters things by hand as before.
- **Transfers between your own accounts are not imported.** In the Raiffeisen preset, a
  transfer whose counterparty is the account holder (`Název účtu`; at least two name words, the
  shorter name contained in the longer, titles, order, case and diacritics ignored -- a shared
  surname alone never matches) is marked `own_transfer`. Such rows are excluded by default and
  listed in one collapsed line, where a single row can still be included; any line can be moved
  into that group by hand. The holder's name words are also removed from every text sent to
  the model, even when detection misses a row.
- **Opening balances step.** The account balance (section 6) and, per savings fund, the fund's
  balance after the file's last row (`fund_balances`; funds can be created inline). Per fund,
  opening = stated balance - the fund's balance in the ledger up to the file's last day, booked
  as one `-opening` row tagged with the fund in the `Starting Balance` category; the account's
  "Starting balance" row gets `+opening` back, so the account balance is unaffected. All of it
  is part of the batch, so undo removes it.
- **The compromise, stated in the UI.** Because own transfers are skipped and balances are
  fixed with one starting row each (dated the day before the first imported row), balances are
  exact on the file's last day and approximate before it; income and spending are unaffected.
