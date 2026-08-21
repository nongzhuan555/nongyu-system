import { z } from "zod";
import { zodToJsonSchema } from "../src/core/tool/json-schema";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const usersListSchema = z.object({
  keyword: z.string().optional().describe("学号或姓名模糊"),
  role: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .describe("0 普通 1 管理员"),
  status: z
    .union([z.literal(0), z.literal(1)])
    .optional()
    .describe("0 禁用 1 正常"),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
});

const json = zodToJsonSchema(usersListSchema);
const properties = json.properties as Record<string, Record<string, unknown>>;

assert(json.type === "object", "root should be object");
assert(
  json.required === undefined,
  `optional fields must not be required, got ${JSON.stringify(json.required)}`,
);

assert(properties.keyword.type === "string", "keyword type");
assert(properties.keyword.description === "学号或姓名模糊", "keyword describe");

assert(Array.isArray(properties.role.enum), "role enum");
assert(
  JSON.stringify(properties.role.enum) === "[0,1]",
  `role enum ${JSON.stringify(properties.role.enum)}`,
);
assert(properties.role.description === "0 普通 1 管理员", "role describe");
assert(properties.role.type === "integer" || properties.role.type === "number", "role type");

assert(JSON.stringify(properties.status.enum) === "[0,1]", "status enum");
assert(properties.status.description === "0 禁用 1 正常", "status describe");

assert(properties.page.type === "integer" || properties.page.type === "number", "page type");
assert(properties.page.minimum === 1, "page min");
assert(properties.pageSize.maximum === 50, "pageSize max");

const growth = zodToJsonSchema(
  z.object({
    range: z.enum(["7d", "30d", "90d", "180d", "365d"]).optional(),
  }),
);
assert(growth.required === undefined, "optional enum must not be required");
const range = (growth.properties as Record<string, Record<string, unknown>>).range;
assert(JSON.stringify(range.enum) === '["7d","30d","90d","180d","365d"]', "range enum");

const detail = zodToJsonSchema(z.object({ id: z.number().int().positive() }));
assert(JSON.stringify(detail.required) === '["id"]', "required id");

const dateSchema = zodToJsonSchema(
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
);
const date = (dateSchema.properties as Record<string, Record<string, unknown>>).date;
assert(typeof date.pattern === "string" && date.pattern.includes("d{4}"), "date pattern");
assert(dateSchema.required === undefined, "optional date not required");

console.log(JSON.stringify(json, null, 2));
console.log("json-schema.test.ts passed");
