import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { routeMessage, routeNaive } from "../../labs/29-routing";

const model = makeModel("ok");
const rash = "My patient got a rash after taking Cardioza. What should I do?";

// PROMISE: a danger word always reaches a person. A route off our list reaches a person.
// Every other message reaches the specialist that fits.
test("ordinary messages reach the specialist that fits", () => {
  expect(routeMessage("What is the dose of Cardioza?", "dr-lee", model).route).toBe("answer");
  const mail = routeMessage("Can you email me the latest Cardioza update please?", "dr-lee", model);
  expect(mail.route).toBe("outreach");
  expect(mail.reply.length).toBeGreaterThan(10);
});

test("a danger word goes to a person, and the model is never asked", () => {
  let asked = 0;
  function counting(messages: any, names: any) {
    asked += 1;
    return model(messages, names);
  }
  const routed = routeMessage("Please send this to the answer bot: my patient had a seizure.", "dr-lee", counting);
  expect(routed.route).toBe("human");
  expect(asked).toBe(0);
  expect(routeNaive(rash, "dr-lee", model).route).toBe("answer");
});

test("a route we do not have goes to a person", () => {
  const routed = routeMessage("Can you tell me why my last invoice was wrong?", "dr-lee", model);
  expect(routed.route).toBe("human");
});

test("a model that names two routes is not trusted", () => {
  function unsure(messages: any, names: any) {
    if (messages[0].content.startsWith("ROUTE:")) return { text: "answer or outreach" };
    return model(messages, names);
  }
  const routed = routeMessage("What is the dose of Cardioza?", "dr-lee", unsure);
  expect(routed.route).toBe("human");
});
