// Lab 3: the first gates. Two reasons to stop and call a person: no approved document, or a failed output check.
import { banner, askFrom, eachQuestion, flags, modelFrom } from "../src/cli";
import { handleHcpInquiry } from "../src/inquiry";

const f = flags();
const country = f.country ?? "US";
const model = modelFrom(f);
const ask = askFrom(f);

banner(
  "Lab 3: human in the loop gates",
  `Try "Cardioza dose" (passes), "Cardioza use in children" (gate 2 if you add --model nocite), "Zorbex dose" (gate 1).\nAdd --approve y or --approve n to answer every gate without typing.`,
);

eachQuestion(f, "Ask a doctor question.", (question) => {
  const outcome = handleHcpInquiry(question, country, model, ask);
  console.log(`\n  path   : ${outcome.path.join(" > ")}`);
  console.log(`  status : ${outcome.status}`);
  if (outcome.reply) console.log(`  reply  : ${outcome.reply}`);
});
