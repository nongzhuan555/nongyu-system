# 技术设计文档
### 技术栈
- 处理编码（iconv-lite）
- 存储二进制（buffer）
- 网络请求（axios）
### 架构设计
- 网络层
基于axios封装request函数，再基于此封装get和post函数对外暴露，对于request，使用请求拦截器添加cookie，对于响应，使用响应拦截器处理编码，同时需要判断响应体是否包含“登录超时”字符串，若包含则自动重新登录，重新发起刚刚失败的请求，若是因为登录失败则只重试一次，若是因为其他原因如网络则重试3次
对于get请求最终fetchJiaowuHtml函数，用于获取教务系统页面的HTML内容
- 解析层
使用packages\nongyu-tool-jiaowu\core\extractor目录下的文件，用于从原始HTML中清洗出结构化数据
- 直接导出层
整合网络层和解析层，提供直接导出数据的功能
最终分别放在packages\nongyu-tool-jiaowu\core\jiaowu再统一导出
