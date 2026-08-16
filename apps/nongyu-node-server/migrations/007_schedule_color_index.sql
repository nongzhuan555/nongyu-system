-- 自定义日程可选色板下标
-- charset: utf8mb4 / engine: InnoDB

ALTER TABLE custom_schedules
  ADD COLUMN color_index TINYINT NULL AFTER weeks_list,
  ADD CONSTRAINT chk_schedules_color_index
    CHECK (color_index IS NULL OR (color_index BETWEEN 0 AND 7));
