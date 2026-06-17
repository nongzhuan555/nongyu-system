import { extractPersonalInfo } from './packages/nongyu-tool-jiaowu/core/extractor/personalInfoExtractor';

const mockHtml = `
<html>
<body>
  <div class="welcome">欢迎您：张三，学号：2020123456，身份：学生，校区：雅安校区，学院：信息工程学院，年级：2020，专业：计算机科学与技术</div>
  <table>
    <tr>
      <td>姓名</td>
      <td>张三</td>
      <td>学号</td>
      <td>2020123456</td>
    </tr>
    <tr>
      <td>学院</td>
      <td>信息工程学院</td>
      <td>专业</td>
      <td>计算机科学与技术（本科）</td>
    </tr>
  </table>
  <div>
    所在校区：成都校区
  </div>
</body>
</html>
`;

const result = extractPersonalInfo(mockHtml);
console.log('Extracted Info:', JSON.stringify(result, null, 2));

if (result.fields.name === '张三' && result.fields.studentId === '2020123456' && result.fields.major === '计算机科学与技术') {
  console.log('Test Passed!');
} else {
  console.log('Test Failed!');
  process.exit(1);
}
