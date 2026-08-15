import { appFetch } from "@/api/appClient";
import type { CourseEntry } from "../model/types";

const BASE = "/api/app/course-share";

export type CourseShareStatus = {
  shareEnabled: boolean;
  updatedAt: string | null;
};

export type CourseSharePeer = {
  studentNo: string;
  courses: CourseEntry[];
  updatedAt: string;
};

export async function getMyShareStatusApi(): Promise<CourseShareStatus> {
  return appFetch<CourseShareStatus>(`${BASE}/me`);
}

export async function putMyShareApi(
  body: { enabled: true; courses: CourseEntry[] } | { enabled: false },
): Promise<CourseShareStatus> {
  return appFetch<CourseShareStatus>(`${BASE}/me`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getShareByStudentNoApi(studentNo: string): Promise<CourseSharePeer> {
  return appFetch<CourseSharePeer>(`${BASE}/by-student/${encodeURIComponent(studentNo)}`);
}
