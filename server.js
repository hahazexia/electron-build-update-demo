const Koa = require('koa');
const app = new Koa();
const serve = require('koa-static-server');
const { rangeStatic } = require('koa-range-static');

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
