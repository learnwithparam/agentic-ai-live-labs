// Six invented chunks of approved documents. The retrieval lab uses them.

import type { Chunk } from "../labs/12-retrieval";

export const CHUNKS: Chunk[] = [
  { id: "C-1", country: "US", text: "Cardioza dose for adults is 10mg once daily with food." },
  { id: "C-2", country: "DE", text: "Cardioza dose for adults is 5mg once daily in the morning." },
  { id: "C-3", country: "US", text: "Cardioza side effects include dizziness and a dry cough." },
  { id: "C-4", country: "US", text: "Neurovex dose for migraine is 50mg at the first sign of pain." },
  { id: "C-5", country: "US", text: "Neurovex storage: keep tablets below 25 degrees in a dry place." },
  { id: "C-6", country: "US", text: "Dermalin cream use: twice daily on clean dry skin." },
];
