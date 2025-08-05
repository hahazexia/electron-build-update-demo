import Koa from 'koa';
import serve from 'koa-static-server';
import { rangeStatic } from 'koa-range-static';

const app = new Koa();

// 注释掉的代码也转换为 ES Module 语法格式
// app.use(
//   serve({
//     rootDir: 'public',
//     rootPath: '/',
//     setHeaders: (res, path, stat) => {
//       res.setHeader('Accept-Ranges', 'bytes');
//       res.setHeader('Content-Type', 'multipart/byteranges');
//     },
//   })
// );

app.use(rangeStatic({ root: 'public', directory: true }));
app.listen(33855);
