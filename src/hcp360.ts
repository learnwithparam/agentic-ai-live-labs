// The four systems behind the HCP profiles lab. All the people and the numbers here are invented.
// Each system keeps its own list. They share one key: the NPI, a 10-digit number for each doctor.
// Some rows have no NPI. Names are not a key, because two doctors can share one name.

export type Row = { system: string; npi: string; name: string; daysAgo: number; what: string };
export type Person = { npi: string; name: string; country: string; specialty: string; optedOut: boolean };

export const CRM_ROWS: Person[] = [
  { npi: "1000000001", name: "Dr. Lee", country: "US", specialty: "Cardiology", optedOut: false },
  { npi: "1000000002", name: "Dr. Weber", country: "DE", specialty: "Cardiology", optedOut: false },
  { npi: "1000000003", name: "Dr. Rao", country: "US", specialty: "Neurology", optedOut: true },
  { npi: "1000000004", name: "Dr. Lee", country: "US", specialty: "Dermatology", optedOut: false },
  { npi: "1000000005", name: "Dr. Okafor", country: "US", specialty: "Dermatology", optedOut: false },
];

export const MAIL_ROWS: Row[] = [
  { system: "email", npi: "1000000001", name: "Dr. Lee", daysAgo: 3, what: "Cardioza launch email" },
  { system: "email", npi: "1000000001", name: "Dr. Lee", daysAgo: 10, what: "Webinar invite" },
  { system: "email", npi: "1000000003", name: "Dr. Rao", daysAgo: 1, what: "Neurovex study summary" },
];

export const EVENT_ROWS: Row[] = [
  { system: "events", npi: "1000000002", name: "Dr. Weber", daysAgo: 12, what: "Cardioza webinar" },
  { system: "events", npi: "", name: "Dr. Okafor", daysAgo: 1, what: "Booth visit" },
];

export const INQUIRY_ROWS: Row[] = [
  { system: "inquiries", npi: "1000000001", name: "Dr. Lee", daysAgo: 5, what: "Asked about the dose" },
  { system: "inquiries", npi: "1000000004", name: "Dr. Lee", daysAgo: 2, what: "Asked about Dermalin" },
];

export const ALL_ROWS: Row[] = [...MAIL_ROWS, ...EVENT_ROWS, ...INQUIRY_ROWS];
