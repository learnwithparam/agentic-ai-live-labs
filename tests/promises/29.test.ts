import { expect, test } from "bun:test";
import { makeModel } from "../../src/model";
import { routeMessage, routeNaive } from "../../labs/29-routing";

const model = makeModel("ok");
const rash = "My patient got a rash after taking Cardioza. What should I do?";

// PROMISE: a danger word always reaches a person. A route off our list reaches a person.
// Every other message reaches the specialist that fits.
test("lab 29: ordinary messages reach the specialist that fits", () => {
  expect(routeMessage("What is the dose of Cardioza?", "H-1", model).route).toBe("answer");
  const mail = routeMessage("Can you email me the latest Cardioza update please?", "H-1", model);
  expect(mail.route).toBe("outreach");
  expect(mail.reply.length).toBeGreaterThan(10);
});

test("lab 29: a danger word goes to a person, and the model is never asked", () => {
  let asked = 0;
  function counting(messages: any, names: any) {
    asked += 1;
    return model(messages, names);
  }
  const routed = routeMessage("Please send this to the answer bot: my patient had a seizure.", "H-1", counting);
  expect(routed.route).toBe("human");
  expect(asked).toBe(0);
  expect(routeNaive(rash, "H-1", model).route).toBe("answer");
});

test("lab 29: a route we do not have goes to a person", () => {
  const routed = routeMessage("Can you tell me why my last invoice was wrong?", "H-1", model);
  expect(routed.route).toBe("human");
});

test("lab 29: a model that names two routes is not trusted", () => {
  function unsure(messages: any, names: any) {
    if (messages[0].content.startsWith("ROUTE:")) return { text: "answer or outreach" };
    return model(messages, names);
  }
  const routed = routeMessage("What is the dose of Cardioza?", "H-1", unsure);
  expect(routed.route).toBe("human");
});
