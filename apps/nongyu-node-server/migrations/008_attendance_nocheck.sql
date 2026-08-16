-- 考勤状态扩展：nocheck = 未考勤（老师未检查本节）
-- MySQL 8：先 DROP 再 ADD CHECK

ALTER TABLE course_attendances DROP CHECK chk_att_status;
ALTER TABLE course_attendances
  ADD CONSTRAINT chk_att_status
  CHECK (status IN ('present', 'late', 'absent', 'leave', 'nocheck'));
