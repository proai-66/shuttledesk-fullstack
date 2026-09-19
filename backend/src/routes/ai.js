const express = require("express");
const router = express.Router();

// Ported from the original supabase/functions/parse-ticket edge function.
// GEMINI_API_KEY now lives as a backend env var instead of a Supabase secret —
// same rule as before: it never reaches the browser, and this route requires
// requireAuth() upstream, same as the edge function's default JWT check.

const GEMINI_MODEL = "gemini-3.6-flash";

const SCHEMA_DESCRIPTION = `
Categories and their fields:
- Equipment: fields = { items: [ { item, type, size, quantity }, ... one entry per distinct item mentioned ], requireDate: "YYYY-MM-DD" }

  item — pick the ONE closest match, using who it's for as the deciding signal:
    STUDENT-owned items (text says "student", "player", or names a student):
      "Students Tshirt", "Students racquet", "Students String & Grip"
    COACH-owned / company-owned items (text says "coach", "company", or doesn't name a student at all):
      "Coach Tshirt", "Company racquet" (this IS the coach's/company's racquet — there is no separate "Coach racquet" value, always use "Company racquet" for a coach's racquet), "Coach multishuttle", "Coach game play shuttle"
    Shared, no owner distinction: "Skipping rope"
    A racquet and a Tshirt for the SAME kind of person still need picking correctly per owner — e.g. "a coach racquet and a coach shirt" is TWO items: "Company racquet" AND "Coach Tshirt". A request naming both a coach item and a student item of the same kind (e.g. "one coach racquet and one student racquet, both free") is TWO separate entries, one with item="Company racquet" and one with item="Students racquet" — never merge them into a single entry or drop one.

  type — "Purchase" or "FOC" (free of charge). This applies to EVERY item, coach-owned or student-owned alike — "free"/"给免费的"/"不用钱" anywhere near an item means that item's type is "FOC"; otherwise default to "Purchase" if a type is implied at all, or omit type if the text doesn't say.
  size — only for the two Tshirt items ("Students Tshirt", "Coach Tshirt"), one of ["XS","S","M","L","XL","XXL"].
  quantity — a number, default 1 if not stated.

  The coach's text will often ask for several different items in one request — put EACH as its own entry in the items array. Count carefully: if 4 distinct items are described, the array must have 4 entries, not fewer.

- Schedule: fields = { type: one of ["Leave","Makeup class"], date: "YYYY-MM-DD", reason: string }
- ChangeClass: fields = { to: a branch name from the known branches list, newClass: string }
- Finance: fields = { type: one of ["Tuition payment","Receipt verification"], amount: string }
- SpecialCare: fields = { type: one of ["Late pickup","Injury observation"], note: string }
`.trim();

const EXAMPLE = `
Example — text: "一个教练用的免费球拍，一个学生用的免费球拍，一件免费的教练衣服和一件学生的免费衣服"
Correct output fields.items (order doesn't matter, but all 4 must be present):
[
  { "item": "Company racquet", "type": "FOC", "quantity": 1 },
  { "item": "Students racquet", "type": "FOC", "quantity": 1 },
  { "item": "Coach Tshirt", "type": "FOC", "quantity": 1 },
  { "item": "Students Tshirt", "type": "FOC", "quantity": 1 }
]
`.trim();

function buildPrompt(text, branches) {
  const branchList = branches.map((b) => `${b.id}: ${b.name}`).join("\n") || "(none)";
  return `You extract structured ticket data from a coach's free-text request at a badminton academy. The text may be in English, Chinese, or a mix of both.

${SCHEMA_DESCRIPTION}

${EXAMPLE}

Known branches (id: name):
${branchList}

Given the coach's text, output ONLY a JSON object (no markdown fences, no explanation) with this exact shape:
{
  "category": one of ["Equipment","Schedule","ChangeClass","Finance","SpecialCare"], or null if unclear,
  "branchId": one of the known branch ids above, or null if not mentioned/unclear,
  "fields": { ...only the fields relevant to the chosen category, using the exact keys shown above, omit anything not mentioned in the text }
}

Coach's text: "${text.replace(/"/g, '\\"')}"`;
}

// POST /api/ai/parse-ticket  { text, branches }
router.post("/parse-ticket", async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not set on the backend" });

  const { text, branches } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: "No text provided" });

  const prompt = buildPrompt(String(text), Array.isArray(branches) ? branches : []);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    });
    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      console.error("[parse-ticket] Gemini request failed", geminiRes.status, JSON.stringify(data));
      return res.status(502).json({ error: data?.error?.message || `Gemini request failed (${geminiRes.status})` });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      console.error("[parse-ticket] Empty response from Gemini", JSON.stringify(data));
      return res.status(502).json({ error: "Empty response from Gemini" });
    }

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch {
      console.error("[parse-ticket] Could not parse Gemini output as JSON:", raw);
      return res.status(502).json({ error: "Could not parse Gemini output" });
    }

    res.json(parsed);
  } catch (e) {
    console.error("[parse-ticket] Unexpected error", e);
    res.status(500).json({ error: e.message || "Unexpected error" });
  }
});

module.exports = router;
