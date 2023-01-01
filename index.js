/**
 * @file iodb库
 * @date 2022-07-25
 * @author Perfumere
 */

import { OkerLimit } from 'oker-limit';

const { toString, hasOwnProperty } = Object.prototype;

function _type(target, typ) {
    return toString.call(target).toLowerCase() === `[object ${typ}]`;
}

function _odiType(target) {
    return ['string', 'number', 'boolean', 'undefined'].includes(typeof target) || _type(target, 'null');
}

function _hasProp(target, key) {
    return hasOwnProperty.call(target, key);
}

function _eq(target, other, loosen = false) {
    if (loosen) {
        _type(target, 'array') && target.sort();
        _type(other, 'array') && other.sort();
    }

    return JSON.stringify(target) === JSON.stringify(other);
}

function _clone(target) {
    try { return JSON.parse(JSON.stringify(target)); } catch (err) { return {}; }
}

/**
 * unwrap promise
 */
function _signal() {
    let resolve, reject;
    const promise = new Promise((r, e) => (resolve = r, reject = e));

    return { resolve, reject, promise };
}

let fixedIOSbug = false;
const dbPool = {};

/**
 * 获取indexedDB链接实例
 * @param opts.name 数据库名
 * @param opts.version 版本
 * @returns IDBDatabase
 */
export function connect(opts = { version: 1 }) {
    const { name, tables, version = 1 } = opts;

    if (!fixedIOSbug) {
        /**
         * [fix webkit bug](https://bugs.webkit.org/show_bug.cgi?id=226547)
         */
        indexedDB.open('__test', 1);
        fixedIOSbug = true;
    }

    if (!dbPool[name] || !dbPool[name].promise) {
        const signalCtrl = _signal();
        const limit = OkerLimit(15);
        const promise = signalCtrl.promise;
        const idbReq = indexedDB.open(name, version);

        dbPool[name] = { db: undefined, tables, reqQueue: [], promise };
        promise.getCollection = (tname) => collection(name, tname);
        promise.close = () => close(name);

        idbReq.onupgradeneeded = () => _createTables(idbReq.result, tables);
        idbReq.onsuccess = () => {
            dbPool[name].db = idbReq.result;

            // process cached request
            for (const request of dbPool[name].reqQueue) {
                try { limit(request); }
                catch (err) { /* None */ }
            }

            dbPool[name].reqQueue = null;
            signalCtrl.resolve({
                getCollection: promise.getCollection,
                close: () => promise.close
            });
        };
        idbReq.onerror = () => signalCtrl.reject(idbReq.error);
    }

    return dbPool[name].promise;
}

/**
 * 获取指定表
 */
function collection(name, tname) {
    const signalCtrl = _signal();
    const promise = signalCtrl.promise;
    const { primary = '_id', unique = [], index = [] } = dbPool[name].tables[tname] || {};
    const handlers = {
        /** Props */
        database: { value: name, configurable: false },
        collection: { value: tname, configurable: false },
        indexes: { value: { primary, unique, index }, configurable: false },
        /** Methods */
        findById: { value: findById, configurable: false },
        findOne: { value: findOne, configurable: false },
        find: { value: find, configurable: false },
        deleteOne: { value: deleteOne, configurable: false },
        deleteMany: { value: deleteMany, configurable: false },
        updateOne: { value: insert, configurable: false },
        updateMany: { value: insert, configurable: false }
    };

    Object.defineProperties(promise, handlers);

    dbPool[name].promise.then(
        () => signalCtrl.resolve(Object.defineProperties({ __proto__: null }, handlers))
    );

    return promise;
}

/**
 * 关闭指定数据库
 */
function close(name) {
    dbPool[name].promise.then(() => {
        dbPool[name].db.close();
        dbPool[name].reqQueue = null;
        dbPool[name].db = undefined;

        delete dbPool[name];
    });
}

/**
 * 新增一条记录
 * @param tname 表名
 * @param data 数据
 */
function insert(data, cloned = false) {
    const { primary = '_id' } = this.indexes;
    return _insert(this.database, this.collection, primary, cloned, data);
}

function findById(_id) {
    const { resolve, reject, promise } = _signal();

    const request = () => {
        const req = _getStore(this.database, this.collection).store.get(_id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    };

    _addTask(this.database, request);

    return promise;
}

function findOne(search) {
    return _find.call(this, search, false);
}

function find(search) {
    return _find.call(this, search, true);
}

function deleteOne(search) {
    return _delete.call(this, search, false);
}

function deleteMany(search) {
    return _delete.call(this, search, true);
}

function _delete(search, removeMany) {
    const { promise, resolve, reject } = _signal();

    const request = async () => {
        let matched = await _find.call(this, search, removeMany);

        if (!matched) {
            resolve(new RemoveResult(0));
        }
        else {
            matched = (Array.isArray(matched) ? matched : [matched]);

            try {
                const { store, transaction } = _getStore(this.database, this.collection, 'readwrite');

                for (const item of matched) {
                    await store.delete(item._id);
                }

                await transaction.complete;

                resolve(new RemoveResult(matched.length));
            }
            catch (err) { reject(err); }
        }
    };

    _addTask(this.database, request);

    return promise;
}

/**
 * 建表
 */
function _createTables(idb, tables) {
    for (const tname in tables) {
        const indexes = tables[tname] || { primary: '_id' };

        if (!idb.objectStoreNames.contains(tname)) {
            const tableIns = idb.createObjectStore(tname, { keyPath: indexes.primary });

            if (indexes.unique) {
                for (const uniqueKey of indexes.unique) {
                    tableIns.createIndex(uniqueKey, uniqueKey, { unique: true });
                }
            }
            if (indexes.index) {
                for (const indexKey of indexes.unique) {
                    tableIns.createIndex(indexKey, indexKey, { unique: false });
                }
            }
        }
    }
}

function _getStore(name, tname, permission) {
    const transaction = dbPool[name].db.transaction(tname, permission);

    return {
        store: transaction.objectStore(tname),
        transaction
    };
}

function _getStoreCursor(name, tname, range) {
    const transaction = dbPool[name].db.transaction(tname);
    return transaction.objectStore(tname).openCursor(range, 'prev');
}

function _getIdxCursor(name, tname, iname, range) {
    const transaction = dbPool[name].db.transaction(tname);
    return transaction.objectStore(tname).index(iname).openCursor(range, 'prev');
}

function _cursorRange(filter) {
    let lowerOpen = true, upperOpen = true;
    let lower, upper;

    if (_type(filter, 'object')) {
        let range;

        filter.$lte !== undefined && (upper = filter.$lte, upperOpen = false);
        filter.$gte !== undefined && (lower = filter.$gte, lowerOpen = false);
        upper === undefined && filter.$lt !== undefined && (upper = filter.$lt);
        lower === undefined && filter.$gt !== undefined && (lower = filter.$gt);

        if (lower !== undefined && upper === undefined) {
            range = IDBKeyRange.lowerBound(lower, lowerOpen);
        }
        else if (upper !== undefined && lower === undefined) {
            range = IDBKeyRange.upperBound(upper, upperOpen);
        }
        else if (lower !== undefined && upper !== undefined) {
            range = IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen);
        }

        delete filter.$lte;
        delete filter.$gte;
        delete filter.$lt;
        delete filter.$gt;

        return range;
    }
}

function _addTask(name, functor) {
    if (dbPool[name].db) {
        functor();
    }
    else {
        dbPool[name].reqQueue.push(functor);
    }
}

function _find(search, pickMany) {
    const filters = _clone(search);
    const filterKey = Object.keys(filters);
    const { resolve, reject, promise } = _signal();

    const request = () => {
        const result = [];
        const query = _getRangeQuery(filterKey, filters);
        const cursor = _getCursor(this.database, this.collection, this.indexes, query);

        cursor.onerror = reject;
        cursor.onsuccess = () => {
            const next = cursor.result;

            if (next) {
                result.push(next.value);

                if (pickMany) {
                    next.continue();
                }
                else {
                    const matched = _filter(result, filterKey, filters, pickMany);

                    if (!matched) {
                        return next.continue();
                    }

                    resolve(matched);
                }
            }
            else {
                if (pickMany) {
                    resolve(_filter(result, filterKey, filters, pickMany));
                }
                else {
                    resolve(null);
                }
            }
        };
    };

    _addTask(this.database, request);

    return promise;
}

function _insert(name, tname, primary, cloned, data) {
    const { resolve, reject, promise } = _signal();

    const request = async () => {
        const { store, transaction } = _getStore(name, tname, 'readwrite');
        let nInserted = 0;

        try {
            if (_type(data, 'array')) {
                const keys = [];

                for (let i = data.length - 1; i >= 0; --i) {
                    const item = data[i];

                    if (item && !keys.includes(item[primary])) {
                        if (_type(item.value, 'arraybuffer')) {
                            await store.put(item.value, item[primary]);
                        }
                        else {
                            await store.put(cloned ? _clone(item) : item, store.keyPath ? undefined : item[primary]);
                        }

                        keys.push(item[primary]);
                        nInserted += 1;
                    }
                }
            }
            else if (_type(data, 'object')) {
                if (_type(data.value, 'arraybuffer')) {
                    await store.put(data.value, data[primary]);
                }
                else {
                    await store.put(cloned ? _clone(data) : data, store.keyPath ? undefined : data[primary]);
                }

                nInserted += 1;
            }

            await transaction.complete;

            resolve(new WriteResult(nInserted));
        }
        catch (err) { reject(err); }
    };

    _addTask(name, request);

    return promise;
}

function _getCursor(name, tname, indexes, query) {
    const { key, range } = query;
    const { unique, index } = indexes;

    if (range && (unique.includes(key) || index.includes(key))) {
        return _getIdxCursor(name, tname, key, range);
    }
    else {
        return _getStoreCursor(name, tname, range);
    }
}

function _getRangeQuery(keys, filters) {
    const query = {};

    for (const key of keys) {
        if (!key.includes('.')) {
            const range = _cursorRange(filters[key]);

            if (range) {
                query.key = key;
                query.range = range;

                break;
            }
        }
    }

    return query;
}

function _filter(list, keys, search, pickMany) {
    const result = [];

    for (const item of list) {
        let matched = true;

        for (const key of keys) {
            const filter = search[key];
            const field = _getField(item, key);

            if (!_passPipe(field, filter)) {
                matched = false;

                break;
            }
        }

        if (matched) {
            result.push(item);
        }
    }

    if (!pickMany) {
        return result[0] || null;
    }

    return result;
}

function _passPipe(field, filter) {
    let matched = Array.isArray(field) ? field : [field];

    if (_type(field, 'array') && _type(filter, 'array')) {
        return _eq(field, filter, true);
    }

    if (_odiType(filter)) {
        matched = matched.filter(item => item === filter);
    }
    else if (_type(filter, 'regexp')) {
        matched = matched.filter(item => filter.test(item));
    }
    else if (_hasProp(filter, '$eq')) {
        matched = matched.filter(item => _eq(item, filter.$eq));
    }
    else if (_hasProp(filter, '$ne')) {
        matched = matched.filter(item => !_eq(item, filter.$ne));
    }
    else if (_type(filter.$all, 'array')) {
        matched = matched.filter(item => _eq(item, filter.$all, true));
    }
    else if (_type(filter.$in, 'array')) {
        matched = matched.filter(item => filter.$in.includes(item));
    }
    else if (_type(filter.$nin, 'array')) {
        matched = matched.filter(item => !filter.$nin.includes(item));
    }

    if (filter.$lte !== undefined) {
        matched = matched.filter(item => item <= filter.$lte);
    }
    else if (filter.$lt !== undefined) {
        matched = matched.filter(item => item < filter.$lt);
    }

    if (filter.$gte !== undefined) {
        matched = matched.filter(item => item >= filter.$gte);
    }
    else if (filter.$gt !== undefined) {
        matched = matched.filter(item => item > filter.$gt);
    }

    if (matched.length && _type(filter.$or, 'array')) {
        const tempRes = new Set();

        for (const subFilter of filter.$or) {
            for (const subItem of matched) {
                _passPipe(subItem, subFilter) && tempRes.add(subItem);
            }
        }

        matched = [...tempRes];
    }

    return !!matched.length;
}

function _getField(target, path) {
    if (target[path]) {
        return target[path];
    }

    let result = target;
    const paths = path.split('.');

    try {
        for (const subpath of paths) {
            if (_type(result, 'array')) {
                if (Number.isInteger(+subpath)) {
                    result = result[subpath];
                }
                else {
                    const match = result.filter(item => _hasProp(item, subpath)).map(item => item[subpath]);
                    result = match.length ? match : undefined;
                }
            }
            else if (_type(result, 'object')) {
                result = result[subpath];
            }
            else {
                return undefined;
            }
        }

        return result;
    }
    catch (err) {/* None */ }
}

function WriteResult(num) {
    this.__proto__ = null;
    this.nInserted = num;
}

function RemoveResult(num) {
    this.__proto__ = null;
    this.nRemoved = num;
}
