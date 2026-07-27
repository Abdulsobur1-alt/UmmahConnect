import assert from "node:assert/strict";
import test from "node:test";
import { jobSchema, messageSchema, postSchema, signupSchema } from "../src/lib/validation";
import { profileUpdateFields } from "../src/lib/profile/update";

test("signup requires a verified-quality account payload", () => {
  const parsed = signupSchema.parse({ full_name: "Amina Yusuf", email: "AMINA@example.com", password: "Strong#123", industry: "Tech & Software", career_stage: "Early Career", city: "Lagos", country: "Nigeria", plan: "free" });
  assert.equal(parsed.email, "amina@example.com");
  assert.throws(() => signupSchema.parse({ ...parsed, password: "weak" }));
});

test("profile updates accept privacy and onboarding fields but reject account identity changes", () => {
  assert.deepEqual(profileUpdateFields({ full_name: "Amina", open_to_opportunities: true, allow_connection_requests: false, email: "new@example.com" }), { fullName: "Amina", openToOpportunities: true, allowConnectionRequests: false });
});

test("post and message contracts reject empty member content", () => {
  assert.throws(() => postSchema.parse({ content: "   " }));
  assert.throws(() => messageSchema.parse({ content: "", receiver_id: "not-a-uuid" }));
});

test("job contract permits only supported job types and halal confirmation", () => {
  const base = { title: "Engineer", company: "Ummah", description: "Build useful things", industry: "Tech", location: "Lagos", is_remote: true, job_type: "Full-time", career_stage: "Mid-Level", halal_confirmed: true };
  assert.equal(jobSchema.parse(base).job_type, "Full-time");
  assert.throws(() => jobSchema.parse({ ...base, job_type: "Remote" }));
});
