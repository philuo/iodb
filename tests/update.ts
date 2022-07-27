/**
 * @file 替换/插入示例
 */

import { table } from './init';

export default function () {
    // Case2
    table.updateOne({
        _id: 4,
        name: 456,
        label: 777
    }).then(res => {
        console.log('Case2', res);
    });

    // Case3
    table.updateMany([
        {
            // _id是主键, 本条数据将完整替换旧的记录, 若不存在则插入
            _id: 7,
            name: 123,
            test: { haha: 1 }
        },
        {
            _id: 9,
            name: 123,
            test: [
                { haha: 2 }
            ]
        }
    ]).then(res => {
        console.log('Case3', res);
    });
}
