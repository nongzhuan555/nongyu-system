/**
 * 校验教学/竞赛通知清洗：切片范围 + onclick 条目完整性
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractTeachingNotices } from "./noticeInfoExtractor.ts";
import { extractCompetitionInfo } from "./competitionInfoExtractor.ts";

const dir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(dir, "__fixtures__/jiaowu-home-notices.fragment.html"), "utf8");

const teaching = extractTeachingNotices(html);
const competition = extractCompetitionInfo(html);

const teachingIds = teaching.result.map((i) => i.url.match(/bianhao=(\d+)/)?.[1]);
const competitionIds = competition.result.map((i) => i.url.match(/bianhao=(\d+)/)?.[1]);

const expectTeaching = ["7017", "7009", "7020", "7018", "7016"];
const expectCompetition = ["7017", "7019", "6979", "6969"];

function assertEq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL ${name}\n  actual:   ${a}\n  expected: ${e}`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK ${name}`);
}

assertEq("teaching.count", teaching.result.length, expectTeaching.length);
assertEq("teaching.ids", teachingIds, expectTeaching);
assertEq("teaching.hasOnclick7020", teachingIds.includes("7020"), true);
assertEq("teaching.noLongTerm6456", teachingIds.includes("6456"), false);
assertEq(
  "teaching.noNews1423",
  teaching.result.some((i) => i.url.includes("jwnews")),
  false,
);

assertEq("competition.count", competition.result.length, expectCompetition.length);
assertEq("competition.ids", competitionIds, expectCompetition);
assertEq("competition.hasOnclick6979", competitionIds.includes("6979"), true);
assertEq(
  "competition.noNews",
  competition.result.some((i) => i.url.includes("jwnews")),
  false,
);

if (!process.exitCode) {
  console.log(
    JSON.stringify(
      {
        teaching: teaching.result.map((i) => ({
          title: i.title,
          date: i.date,
          bianhao: i.url.match(/bianhao=(\d+)/)?.[1],
        })),
        competition: competition.result.map((i) => ({
          title: i.title,
          date: i.date,
          bianhao: i.url.match(/bianhao=(\d+)/)?.[1],
        })),
      },
      null,
      2,
    ),
  );
}
