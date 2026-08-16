const rowsByUiId = new Map<string, Record<string, unknown>[]>();

export function putSqlRows(uiId: string, rows: Record<string, unknown>[]): void {
  rowsByUiId.set(uiId, rows);
}

export function getSqlRows(uiId: string): Record<string, unknown>[] | undefined {
  return rowsByUiId.get(uiId);
}
