import type { z } from "zod";

/** Zod v3 `_def` 内部结构（仅取转换所需字段） */
type ZodCheck = {
  kind: string;
  value?: number;
  regex?: RegExp;
  inclusive?: boolean;
};

type ZodInternalDef = {
  typeName: string;
  description?: string;
  innerType?: z.ZodTypeAny;
  schema?: z.ZodTypeAny;
  type?: z.ZodTypeAny;
  value?: unknown;
  values?: unknown;
  options?: z.ZodTypeAny[] | Map<string, z.ZodTypeAny>;
  shape?: (() => Record<string, z.ZodTypeAny>) | Record<string, z.ZodTypeAny>;
  checks?: ZodCheck[];
};

type JsonSchema = Record<string, unknown>;

/**
 * 将 Zod Schema 转为 LLM Function Calling 用的 JSON Schema。
 * Zod 4 若有实例方法 `toJSONSchema` 则走原生；否则按 Zod 3 `_def` 手转。
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const native = schema as z.ZodTypeAny & { toJSONSchema?: () => unknown };
  if (typeof native.toJSONSchema === "function") {
    const result = native.toJSONSchema();
    if (result && typeof result === "object") {
      return result as JsonSchema;
    }
  }

  return convertZodToJSONSchema(schema);
}

function getInternalDef(schema: z.ZodTypeAny): ZodInternalDef {
  return (schema as z.ZodTypeAny & { _def: ZodInternalDef })._def;
}

function getDescription(schema: z.ZodTypeAny): string | undefined {
  return schema.description || getInternalDef(schema).description || undefined;
}

/** 外层 describe 覆盖内层；内层已有 description 则保留 */
function withDescription(json: JsonSchema, description: string | undefined): JsonSchema {
  if (description && typeof json.description !== "string") {
    json.description = description;
  }
  return json;
}

function getObjectShape(def: ZodInternalDef): Record<string, z.ZodTypeAny> {
  if (typeof def.shape === "function") {
    return def.shape();
  }
  if (def.shape && typeof def.shape === "object") {
    return def.shape;
  }
  return {};
}

/** `.optional()` / `.default()` 的字段不得进入 required */
function isOptionalField(schema: z.ZodTypeAny): boolean {
  let current: z.ZodTypeAny | undefined = schema;
  while (current) {
    const def = getInternalDef(current);
    if (def.typeName === "ZodOptional" || def.typeName === "ZodDefault") {
      return true;
    }
    current = unwrapOne(def);
    if (!current) {
      return false;
    }
  }
  return false;
}

/** 剥一层不影响 JSON 形态的包装（Effects/Nullable 等），Optional/Default 不算 */
function unwrapOne(def: ZodInternalDef): z.ZodTypeAny | undefined {
  if (
    def.typeName === "ZodEffects" ||
    def.typeName === "ZodBranded" ||
    def.typeName === "ZodCatch" ||
    def.typeName === "ZodNullable"
  ) {
    return def.innerType ?? def.schema;
  }
  return undefined;
}

function literalJsonType(value: unknown): "string" | "number" | "boolean" | "integer" | undefined {
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return undefined;
}

function convertUnion(options: z.ZodTypeAny[]): JsonSchema {
  const literalValues: unknown[] = [];
  let allLiterals = true;
  for (const option of options) {
    const core = unwrapToCore(option);
    const def = getInternalDef(core);
    if (def.typeName !== "ZodLiteral") {
      allLiterals = false;
      break;
    }
    literalValues.push(def.value);
  }

  if (allLiterals && literalValues.length > 0) {
    const types = new Set(literalValues.map(literalJsonType));
    const json: JsonSchema = { enum: literalValues };
    if (types.size === 1) {
      const only = [...types][0];
      if (only) json.type = only;
    }
    return json;
  }

  return { anyOf: options.map((option) => convertZodToJSONSchema(option)) };
}

function unwrapToCore(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema;
  for (;;) {
    const def = getInternalDef(current);
    if (
      def.typeName === "ZodOptional" ||
      def.typeName === "ZodDefault" ||
      def.typeName === "ZodNullable"
    ) {
      if (!def.innerType) return current;
      current = def.innerType;
      continue;
    }
    const next = unwrapOne(def);
    if (!next) return current;
    current = next;
  }
}

function applyStringChecks(json: JsonSchema, checks: ZodCheck[] | undefined): void {
  if (!checks) return;
  for (const check of checks) {
    if (check.kind === "min" && typeof check.value === "number") {
      json.minLength = check.value;
    } else if (check.kind === "max" && typeof check.value === "number") {
      json.maxLength = check.value;
    } else if (check.kind === "regex" && check.regex) {
      json.pattern = check.regex.source;
    } else if (check.kind === "email") {
      json.format = "email";
    } else if (check.kind === "url") {
      json.format = "uri";
    } else if (check.kind === "uuid") {
      json.format = "uuid";
    } else if (check.kind === "datetime") {
      json.format = "date-time";
    }
  }
}

function applyNumberChecks(json: JsonSchema, checks: ZodCheck[] | undefined): void {
  if (!checks) return;
  for (const check of checks) {
    if (check.kind === "int") {
      json.type = "integer";
    } else if (check.kind === "min" && typeof check.value === "number") {
      json.minimum = check.value;
    } else if (check.kind === "max" && typeof check.value === "number") {
      json.maximum = check.value;
    }
  }
}

function convertNativeEnum(values: unknown): JsonSchema {
  const raw =
    values && typeof values === "object" ? Object.values(values as Record<string, unknown>) : [];
  const enums = raw.filter((item) => typeof item === "string" || typeof item === "number");
  const types = new Set(enums.map(literalJsonType));
  const json: JsonSchema = { enum: enums };
  if (types.size === 1) {
    const only = [...types][0];
    if (only) json.type = only === "integer" ? "number" : only;
  }
  return json;
}

function getUnionOptions(def: ZodInternalDef): z.ZodTypeAny[] {
  if (Array.isArray(def.options)) return def.options;
  if (def.options instanceof Map) return Array.from(def.options.values());
  return [];
}

function convertZodToJSONSchema(schema: z.ZodTypeAny): JsonSchema {
  const def = getInternalDef(schema);
  const description = getDescription(schema);

  switch (def.typeName) {
    case "ZodOptional":
    case "ZodDefault":
    case "ZodNullable":
      return def.innerType
        ? withDescription(convertZodToJSONSchema(def.innerType), description)
        : withDescription({}, description);

    case "ZodEffects":
    case "ZodBranded":
    case "ZodCatch": {
      const inner = def.innerType ?? def.schema;
      return inner
        ? withDescription(convertZodToJSONSchema(inner), description)
        : withDescription({}, description);
    }

    case "ZodString": {
      const json: JsonSchema = { type: "string" };
      applyStringChecks(json, def.checks);
      return withDescription(json, description);
    }

    case "ZodNumber": {
      const json: JsonSchema = { type: "number" };
      applyNumberChecks(json, def.checks);
      return withDescription(json, description);
    }

    case "ZodBoolean":
      return withDescription({ type: "boolean" }, description);

    case "ZodLiteral": {
      const jsonType = literalJsonType(def.value);
      const json: JsonSchema = jsonType
        ? { type: jsonType, enum: [def.value] }
        : { enum: [def.value] };
      return withDescription(json, description);
    }

    case "ZodEnum":
      return withDescription({ type: "string", enum: def.values }, description);

    case "ZodNativeEnum":
      return withDescription(convertNativeEnum(def.values), description);

    case "ZodUnion":
    case "ZodDiscriminatedUnion":
      return withDescription(convertUnion(getUnionOptions(def)), description);

    case "ZodArray":
      return withDescription(
        {
          type: "array",
          items: def.type ? convertZodToJSONSchema(def.type) : {},
        },
        description,
      );

    case "ZodObject":
      return withDescription(convertObject(def), description);

    default:
      return withDescription({}, description);
  }
}

function convertObject(def: ZodInternalDef): JsonSchema {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(getObjectShape(def))) {
    properties[key] = convertZodToJSONSchema(value);
    if (!isOptionalField(value)) {
      required.push(key);
    }
  }
  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}
