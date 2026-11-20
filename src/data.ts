// All data here is invented. Cardioza, Neurovex and Dermalin are not real drugs.

// What search returns when nothing in the approved list matches.
export const NO_DOC = "NO_APPROVED_DOC_FOUND";

export type Doc = { drug: string; country: string; text: string };

export const APPROVED_DOCS: Record<string, Doc> = {
  "CARDIOZA-US": { drug: "Cardioza", country: "US", text: "Cardioza standard adult dose is 10mg once daily with food." },
  "CARDIOZA-DE": { drug: "Cardioza", country: "DE", text: "Cardioza standard adult dose is 5mg once daily in the morning." },
  "NEUROVEX-US": { drug: "Neurovex", country: "US", text: "Neurovex is approved for adults with migraine. Take 50mg at the first sign of pain." },
  "DERMALIN-US": { drug: "Dermalin", country: "US", text: "Dermalin cream is applied twice daily to clean, dry skin." },
};

// Every version of a label. The newest version is the only one a reply may use.
export type Label = { id: string; version: number; adult: string; child: string };
export const LABELS: Label[] = [
  { id: "CARDIOZA-US", version: 1, adult: "20mg", child: "5mg" },
  { id: "CARDIOZA-US", version: 2, adult: "10mg", child: "5mg" },
  { id: "CARDIOZA-DE", version: 1, adult: "5mg", child: "2.5mg" },
];

export type Hcp = { name: string; country: string; specialty: string };

export const CRM: Record<string, Hcp> = {
  "dr-lee": { name: "Dr. Lee", country: "US", specialty: "Cardiology" },
  "dr-weber": { name: "Dr. Weber", country: "DE", specialty: "Cardiology" },
  "dr-rao": { name: "Dr. Rao", country: "US", specialty: "Neurology" },
};

export const EMAILS: Record<string, string[]> = {
  "dr-lee": ["Cardioza launch email, 3 days ago", "Cardioza webinar invite, 10 days ago"],
  "dr-weber": [],
  "dr-rao": ["Neurovex study summary, 1 day ago"],
};

export const KNOWN_DRUGS = [...new Set(Object.values(APPROVED_DOCS).map((doc) => doc.drug))];
