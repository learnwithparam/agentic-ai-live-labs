// All data here is invented. Cardioza, Neurovex and Dermalin are not real drugs.

export type Doc = { drug: string; country: string; text: string };

export const APPROVED_DOCS: Record<string, Doc> = {
  "DOC-101": { drug: "Cardioza", country: "US", text: "Cardioza standard adult dose is 10mg once daily with food." },
  "DOC-102": { drug: "Cardioza", country: "DE", text: "Cardioza standard adult dose is 5mg once daily in the morning." },
  "DOC-201": { drug: "Neurovex", country: "US", text: "Neurovex is approved for adults with migraine. Take 50mg at the first sign of pain." },
  "DOC-301": { drug: "Dermalin", country: "US", text: "Dermalin cream is applied twice daily to clean, dry skin." },
};

export type Hcp = { name: string; country: string; specialty: string };

export const CRM: Record<string, Hcp> = {
  "H-1": { name: "Dr. Lee", country: "US", specialty: "Cardiology" },
  "H-2": { name: "Dr. Weber", country: "DE", specialty: "Cardiology" },
  "H-3": { name: "Dr. Rao", country: "US", specialty: "Neurology" },
};

export const EMAILS: Record<string, string[]> = {
  "H-1": ["Cardioza launch email, 3 days ago", "Cardioza webinar invite, 10 days ago"],
  "H-2": [],
  "H-3": ["Neurovex study summary, 1 day ago"],
};

export const KNOWN_DRUGS = [...new Set(Object.values(APPROVED_DOCS).map((d) => d.drug))];
