/** 课表扩展同步：outbox / tombstone 类型 */

export type CourseExtEntity = "schedule" | "note" | "todo" | "attendance";

export type CourseExtOutboxOp = {
  id: string;
  op: "create" | "update" | "delete";
  entity: CourseExtEntity;
  entityId: string;
  /** create 全量 / update patch */
  payload?: unknown;
  updatedAt: string;
};

export type CourseExtTombstone = {
  entity: CourseExtEntity;
  entityId: string;
  deletedAt: string;
};
