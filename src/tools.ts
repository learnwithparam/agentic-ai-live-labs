import { APPROVED_DOCS, CRM, EMAILS } from "./data";

export const NO_DOC = "NO_APPROVED_DOC_FOUND";

// A tool is a plain function from arguments to text.
export type Tool = (args: Record<string, string>) => string;

export function searchApprovedDocs(query: string, country: string): string {
  const hits = Object.entries(APPROVED_DOCS)
    .filter(([, d]) => d.country === country && query.toLowerCase().includes(d.drug.toLowerCase()))
    .map(([id, d]) => `[${id}] ${d.text}`);
  return hits.length > 0 ? hits.join("\n") : NO_DOC;
}

export const tools: Record<string, Tool> = {
  search_approved_docs: (a) => searchApprovedDocs(a.query ?? "", a.country ?? ""),
  check_recent_outreach: (a) => {
    const mails = EMAILS[a.hcpId ?? ""] ?? [];
    return mails.length > 0 ? `Recent outreach: ${mails.join("; ")}` : "No recent outreach.";
  },
  get_hcp_profile: (a) => {
    const p = CRM[a.hcpId ?? ""];
    return p ? `${p.name}, ${p.specialty}, ${p.country}` : "Unknown HCP.";
  },
};
