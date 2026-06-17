import { z } from 'zod';

/**
 * 将 Zod Schema 转换为 JSON Schema
 *
 * 使用 z.toJSONSchema() (Zod v4) 或手动转换 (Zod v3)
 */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // Zod v3 兼容: 使用 describe 提取描述，手动构建 JSON Schema
  // 如果 Zod 支持 .toJSONSchema() 则直接调用
  if (typeof (schema as any).toJSONSchema === 'function') {
    return (schema as any).toJSONSchema();
  }

  // Zod v3 手动转换
  return convertZodToJSONSchema(schema);
}

function convertZodToJSONSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  const def = (schema as any)._def;

  switch (def.typeName) {
    case 'ZodString':
      return {
        type: 'string',
        description: schema.description || undefined,
      };

    case 'ZodNumber':
      return {
        type: 'number',
        description: schema.description || undefined,
      };

    case 'ZodBoolean':
      return {
        type: 'boolean',
        description: schema.description || undefined,
      };

    case 'ZodArray':
      return {
        type: 'array',
        description: schema.description || undefined,
        items: convertZodToJSONSchema(def.type),
      };

    case 'ZodObject': {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(def.shape() as Record<string, z.ZodTypeAny>)) {
        properties[key] = convertZodToJSONSchema(value);
        if (!(value as any)._def.optionalValidator) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        description: schema.description || undefined,
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    case 'ZodEnum': {
      return {
        type: 'string',
        description: schema.description || undefined,
        enum: def.values,
      };
    }

    case 'ZodOptional':
      return convertZodToJSONSchema(def.innerType);

    default:
      // 兜底：返回任意类型
      return {};
  }
}
