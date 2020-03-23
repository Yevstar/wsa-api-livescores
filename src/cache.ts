// import {createClient} from "redis";
//
// const {promisify} = require('util');
//
const TEN_MIN = 600;
const HOUR = 3600;
const DAY = 86400;
//
// const cacheManager = createClient({
//     host: process.env.REDIS_HOST,
//     port: Number(process.env.REDIS_PORT)
// });
//
// cacheManager.auth('');
// cacheManager.on('error', err => console.error('ERR:REDIS:', err));
// const getAsync = promisify(cacheManager.get).bind(cacheManager);
//
// function fromCache(key, cb) {
//     cacheManager.get(key, cb);
// }
//
// async function fromCacheAsync(key) {
//     return getAsync(key);
// }
//
// function toCache(key, value) {
//     cacheManager.set(key, value);
// }
//
// function toCacheWithTtl(key, value, ttl): any {
//     return cacheManager.setex(key, ttl, value);
// }
//
// function removeFromCache(key): any {
//     return cacheManager.del(key);
// }
//
// function flushAll() {
//     return cacheManager.flushall();
// }
//
export {
    TEN_MIN, HOUR, DAY,
//     cacheManager,
//     fromCache,
//     fromCacheAsync,
//     toCache,
//     toCacheWithTtl,
//     removeFromCache,
//     flushAll
};
