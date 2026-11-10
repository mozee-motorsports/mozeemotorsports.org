/*
 * ==========================================================================
 *  MOZEE MOTORSPORTS MERCH STORE — SETTINGS
 *  This is the only file officers should need to edit.
 * ==========================================================================
 */
window.STORE_CONFIG = {

  /* --------------------------------------------------------------------
   * 1. POWER AUTOMATE LINKS
   * Paste the "HTTP URL" from each flow here (see SETUP.md, steps 3–4).
   * While these are empty, the site runs in DEMO MODE: stock is fake,
   * orders are only saved in your own browser, and a banner says so.
   * ------------------------------------------------------------------ */
  stockUrl: "https://default4046ceacfdd346c9ac80b7c4a49bab.70.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/04/workflows/7aac0e25bc264ffabfa1385a67cb3200/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=QBP1odVNEuWX7I-0fN1Vxf1T95gS9T4LLI8SMM5Rdho",
  orderUrl: "https://default4046ceacfdd346c9ac80b7c4a49bab.70.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/10/workflows/be0b7718e4a442bf83d87baba778f398/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=A_Pw6wxBtfVVdOB7u9NOAiz9Rur69NASL6cI-_sHUj0",

  /* How often (seconds) an open page re-checks live stock. Tabs left idle
   * for 10+ minutes pause checking to save Power Automate runs. */
  refreshSeconds: 60,

  /* --------------------------------------------------------------------
   * 2. PRODUCTS
   * Names, photos and sizes shown on the page. Stock counts and prices
   * come LIVE from the Excel "Inventory" table (edit them there), matched
   * by SKU. The price below is only a fallback if Excel is unreachable.
   * SKU = product "code" + "-" + size, e.g. "OLD-XL", "HAT-OS".
   * cartName (optional) = how the item is written in the cart and receipt.
   * ------------------------------------------------------------------ */
  products: [
    {
      code: "NEW",
      name: "New T-Shirt",
      tag: "MP7",
      cartName: "New T-Shirt (MP7)",
      description: "Mozee Motorsports front, MP7 car and sponsors on the back.",
      price: 25,
      image: "images/shirt-new.jpg",
      sizes: ["S", "M", "L", "XL", "XXL", "XXXL"]
    },
    {
      code: "OLD",
      name: "Classic T-Shirt",
      tag: "No MP7",
      cartName: "Classic T-Shirt (No MP7)",
      description: "Mozee Motorsports Formula Hybrid front, plain back.",
      price: 15,
      image: "images/shirt-old.jpg",
      sizes: ["S", "M", "L", "XL", "XXL", "XXXL"]
    },
    {
      code: "JKT",
      name: "Jacket",
      tag: "Soft shell",
      description: "Black zip-up soft-shell jacket with hood and embroidered chest logo.",
      price: 60,
      image: "images/jacket.jpg",
      sizes: ["S", "M", "L", "XL", "XXL", "XXXL"]
    },
    {
      code: "HAT",
      name: "Hat",
      tag: "One size",
      description: "Black structured snapback with embroidered logo.",
      price: 30,
      image: "images/hat.jpg",
      sizes: ["OS"]
    }
  ],

  /* Display names for size codes. */
  sizeLabels: { OS: "One Size" },

  /* --------------------------------------------------------------------
   * 3. BUYER INFO FIELDS
   * Add, remove or reorder fields here. Name and email are saved to their
   * own Excel columns; every other field is saved together in the
   * "Details" column, so adding a field never requires changing the flow.
   *
   * type: "text" | "email" | "tel" | "textarea" | "select"
   * For "select", add options: ["A", "B"].
   * showIf: { field: "id", equals: "value" } shows a field conditionally.
   * ------------------------------------------------------------------ */
  fields: [
    { id: "name",  label: "Full name", type: "text",  required: true, autocomplete: "name" },
    { id: "email", label: "Email",     type: "email", required: true, autocomplete: "email" },

    // Examples — delete the "// " at the start of a line to turn that field on:
    // { id: "phone", label: "Phone number", type: "tel", required: false, autocomplete: "tel" },
    // { id: "affiliation", label: "I am a…", type: "select", required: true, options: ["Team member", "MSOE student", "Alumni", "Family / friend", "Sponsor"] },
    // { id: "delivery", label: "How do you want to get your order?", type: "select", required: true, options: ["Pick up from the team", "Ship to me"] },
    // { id: "address", label: "Shipping address", type: "textarea", required: true, showIf: { field: "delivery", equals: "Ship to me" } },
    // { id: "notes", label: "Anything else we should know?", type: "textarea", required: false },
  ],

  /* --------------------------------------------------------------------
   * 4. PAYMENT (not decided yet — switch on later)
   * When enabled, these instructions appear on the checkout form and on
   * the order confirmation. {total} and {orderId} are filled in for you.
   * Officers track payment in the "Paid" column in Excel.
   * ------------------------------------------------------------------ */
  payment: {
    enabled: false,
    instructions: "Send {total} on Venmo to @Mozee-Motorsports and put {orderId} in the note."
  },

  /* Shown under the checkout button while payment is disabled. */
  checkoutNote: "No payment is collected on this form. A team officer will contact you about payment and pickup.",

  /* Where buyers go with questions (shown on errors and confirmation). */
  contactText: "Questions? Reach out to any Mozee Motorsports officer."
};
