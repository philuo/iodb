# iodb

## [测试用例](./tests/init.ts)

- ⚡️ 丝滑手感 `indexedDB`操作库
- 📚 传输体积 2.8KB
- ☀️ 无需等待数据库链接完成, 直接写业务CRUD

```ts
import { connect } from 'iodb';

const db = connect({
    name: 'oker',
    tables: {
        /**
         * 初始化表格索引, 支持 primary | unique | index
         */
        test: { primary: '_id' }
    }
});

const col = db.getCollection('test');

table.find({
    _id: {
        $or: [
            { $gte: 9 },
            { $lte: 4 },
        ]
    },
    name: {
        $in: [456]
    }
}).then(res => {
    console.log('Case15', res);
});
```

## API

### 查询操作

```
findById
findOne
find
```

### 更新操作

⚠️主键重复则覆盖原记录

⚠️记录未匹配则插入记录

```
updateOne
updateMany
```

### 删除操作

```
deleteOne
deleteMany
```

## 索引

```ts
connect({
    // 必选
    tables: {
        // 表名
        colname: {
            // 必选：主键名
            primary: '_id',

            // 可选：在给定的字段上分别建立唯一索引
            unique: []

            // 可选：在给定的字段上分别建立非唯一索引
            index: []
        }
    }
})
```

## 查询符

```
$lt
$lte
$gt
$gte
$eq
$ne
$all
$or
```

## todo

- sort
- skip
- limit
- group
- project
- count
- alias