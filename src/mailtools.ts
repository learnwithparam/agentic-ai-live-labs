// The doctor email writer. Labs 29 and 33 use it.

import { APPROVED_DOCS, CRM } from "./data";
import type { CallLlm } from "./model";

// Ask the model for one short email to a doctor. The source is the approved label, nothing else.
export function draftDoctorEmail(doctor: string, callLlm: CallLlm): string {
  const source = APPROVED_DOCS["CARDIOZA-US"].text;
  const prompt = `MAIL: Write one short email to ${CRM[doctor].name}. Use this source only.\nSOURCE: ${source}`;
  return (callLlm([{ role: "user", content: prompt }], []).text || "").trim();
}
