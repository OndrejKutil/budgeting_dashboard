"""
How to pick a category for a merchant, shared by every model prompt that does it (screenshot
import's stage two, statement import's suggestion call). Examples of the reasoning to apply,
not a lookup table.
"""

CATEGORY_MATCHING_GUIDANCE = """- Groceries means buying food to take home and cook: supermarkets and grocery shops (Albert,
  Billa, Lidl, Kaufland, Tesco, Penny Market, Globus, Norma, COOP, Hruška, Žabka, Rohlík.cz,
  Košík.cz, večerka / potraviny).
- Food or drink bought ready to eat is EATING OUT, never groceries — even though the shop
  sells food. That includes bakery and sandwich chains (Bageterie Boulevard, Paul, Crosstown,
  Ugo, Pekárna, Bagetka), cafés (Starbucks, Costa, Kavárna, Café, Coffee), bistros, kiosks,
  canteens (Jídelna, Menza), fast food (McDonald's, KFC, Burger King, Bistro, Pizza, Kebab),
  restaurants, pubs and bars (Hospoda, Pivnice), and food delivery (Wolt, Bolt Food,
  Foodora, Dáme jídlo). Use the user's "Dining out" / "Restaurants" / "Jídlo venku" /
  "Fun"-type expense category for these.
- Drugstores (dm, Rossmann, Teta) -> a drugstore / household category, not groceries.
- Pharmacies (Dr.Max, Benu, Lékárna) -> a health category.
- Public transport and travel (Lítačka, PID, DPP, ČD / České dráhy, RegioJet, Leo Express,
  FlixBus, Uber, Bolt, Liftago) and fuel (Shell, OMV, MOL, Orlen, Benzina, Circle K) ->
  a transport / fuel category.
- Streaming and subscriptions (Netflix, Spotify, HBO Max, Disney+, iCloud, Apple.com/bill,
  Google, gym memberships) -> a subscription-flavoured category if one exists.
- Electronics and general retail (Alza, Datart, CZC, Mall, Amazon, Temu, Apple Store,
  IKEA, Decathlon) -> a general shopping category.
- A notification that reads like a salary, refund, or incoming transfer -> an income
  category, not expense. A person's name as the merchant (a P2P payment) can be either
  direction -- it's an expense if the user paid them, income if they paid the user.
- When nothing fits well, prefer leaving category_id_fk null over forcing a bad match — a
  wrong category is worse than none.
"""
